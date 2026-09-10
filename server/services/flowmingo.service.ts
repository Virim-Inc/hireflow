import crypto from 'crypto';
import { config } from '../config/env.js';
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import * as flowmingoRepo from '../repositories/flowmingo.repo.js';

/**
 * Validates Flowmingo configuration status.
 */
export function checkIntegrationStatus() {
  const { apiKey, baseUrl, webhookSecret } = config.flowmingo;
  const isKeyPresent = Boolean(apiKey && apiKey.trim().length > 0);
  const isKeyPlausible = isKeyPresent && (apiKey.startsWith('fl_live_') || apiKey.startsWith('fl_test_') || apiKey.length >= 10);
  const isWebhookSecretConfigured = Boolean(webhookSecret && webhookSecret.trim().length > 0);

  return {
    configured: isKeyPlausible && isWebhookSecretConfigured,
    hasApiKey: isKeyPresent,
    hasWebhookSecret: isWebhookSecretConfigured,
    baseUrl: baseUrl || 'https://apis.flowmingo.ai',
    message: !isKeyPlausible
      ? 'Flowmingo API key is missing or invalid in server config.'
      : !isWebhookSecretConfigured
      ? 'Flowmingo webhook secret is missing in server config.'
      : 'Flowmingo integration is configured.',
  };
}

/**
 * Verifies X-Webhook-Signature header and timestamp anti-replay skew.
 * Header format: t=1732619345,v1=3f2fdd0af4...
 */
export function verifySignature(rawBody: Buffer, header: string | undefined, overrideSecret?: string): { isValid: boolean; reason?: string; timestamp?: number } {
  const secret = overrideSecret || config.flowmingo.webhookSecret || process.env.FLOWMINGO_WEBHOOK_SECRET;
  if (!secret) {
    return { isValid: false, reason: 'FLOWMINGO_WEBHOOK_SECRET is not configured on server.' };
  }

  if (!header || Array.isArray(header)) {
    return { isValid: false, reason: 'Missing X-Webhook-Signature header.' };
  }

  const parts = header.split(',');
  const tStr = parts.find((p) => p.trim().startsWith('t='))?.split('=')[1];
  const signature = parts.find((p) => p.trim().startsWith('v1='))?.split('=')[1];

  if (!tStr || !signature) {
    return { isValid: false, reason: 'Malformed signature header format.' };
  }

  const timestamp = parseInt(tStr, 10);
  if (isNaN(timestamp)) {
    return { isValid: false, reason: 'Invalid timestamp in signature header.' };
  }

  // Timestamp anti-replay skew check (max 300 seconds / 5 minutes)
  const currentUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(currentUnix - timestamp) > 300) {
    return { isValid: false, reason: `Timestamp skew exceeded 300s (received t=${timestamp}, current=${currentUnix}).` };
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(signature)) {
    return { isValid: false, reason: 'Signature digest is not valid hex.' };
  }

  // Calculate HMAC using full secret key
  const secretsToTry = [secret];
  if (secret.startsWith('whsec_')) {
    secretsToTry.push(secret.replace(/^whsec_/, ''));
  }

  let matches = false;
  const sigBuffer = Buffer.from(signature, 'hex');

  for (const sKey of secretsToTry) {
    const expectedDigest = crypto
      .createHmac('sha256', sKey)
      .update(`${tStr}.${rawBody.toString('utf8')}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedDigest, 'hex');

    if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      matches = true;
      break;
    }
  }

  if (!matches) {
    return { isValid: false, reason: 'HMAC signature digest mismatch.' };
  }

  return { isValid: true, timestamp };
}

/**
 * Synchronously processes and durably persists incoming Flowmingo webhook events.
 */
export async function processWebhookPayload(rawBody: Buffer, signatureHeader: string | undefined) {
  // 1. Verify Signature & Anti-replay Timestamp
  const verification = verifySignature(rawBody, signatureHeader);
  if (!verification.isValid) {
    console.warn(`[Flowmingo Webhook] Rejected request: ${verification.reason}`);
    throw new HttpError(401, `Webhook verification failed: ${verification.reason}`);
  }

  let envelope: any;
  try {
    envelope = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON body payload in webhook.');
  }

  const eventId = envelope.event_id;
  const eventType = envelope.event_type;
  const schemaVersion = envelope.schema_version || '1.0.0';
  const orgId = envelope.organization_id || null;

  if (!eventId || !eventType) {
    throw new HttpError(400, 'Missing event_id or event_type in webhook envelope.');
  }

  // 2. Check Deduplication
  const existing = await flowmingoRepo.getWebhookEventById(eventId);
  if (existing && existing.processing_status === 'processed') {
    console.log(`[Flowmingo Webhook] Duplicate event_id ${eventId} ignored.`);
    return { status: 'duplicate', eventId };
  }

  // 3. Durable Transaction Processing
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Record webhook event as processing
    await flowmingoRepo.insertWebhookEvent(eventId, eventType, schemaVersion, orgId, envelope, 'processing', client);

    const data = envelope.data || {};
    const flowmingoCandidateId = data.candidate_id || null;
    const interviewSetId = data.interview_set_id || null;
    const candidateEmail = data.candidate_email || null;

    // Check if test event or dummy ID
    const isTestEvent = envelope.is_test === true || candidateEmail === 'test@example.com' || interviewSetId === '00000000-0000-0000-0000-000000000000';

    let invitationRecord: flowmingoRepo.FlowmingoInvitationRow | null = null;
    if (!isTestEvent) {
      try {
        invitationRecord = await flowmingoRepo.resolveTargetInvitation(
          flowmingoCandidateId,
          interviewSetId,
          candidateEmail,
          client,
        );
      } catch (err: any) {
        console.warn(`[Flowmingo Webhook Resolution Notice] ${err.message}`);
      }
    }

    // Process event payload if invitation record exists
    if (invitationRecord) {
      // Populate candidate ID on first webhook if currently null
      if (flowmingoCandidateId && !invitationRecord.flowmingo_candidate_id) {
        await flowmingoRepo.populateCandidateIdIfNull(invitationRecord.id, flowmingoCandidateId, client);
      }

      if (eventType.startsWith('invitation.status.update')) {
        const status = data.status || 'invitation_email_delivered';
        await flowmingoRepo.updateInvitationStatus(invitationRecord.id, status, client);
      } else if (eventType.startsWith('interview.status.update')) {
        const status = data.status || 'started';
        await flowmingoRepo.updateInterviewStatus(invitationRecord.id, status, client);
      } else if (eventType.startsWith('interview.evaluation.update')) {
        const evalType = data.evaluation_type || 'interview';
        const rawScore = parseFloat(String(data.evaluation_score ?? 0));
        const subUrl = data.submission_url || null;
        await flowmingoRepo.upsertEvaluation(invitationRecord.id, evalType, rawScore, subUrl, client);
        await flowmingoRepo.updateInterviewStatus(invitationRecord.id, 'completed', client);
        if (subUrl) {
          await client.query(`UPDATE flowmingo_invitations SET submission_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [invitationRecord.id, subUrl]);
        }
      }
    }

    // Mark event as successfully processed (even for test/unmatched events to ensure 200 OK)
    await flowmingoRepo.updateWebhookEventStatus(eventId, 'processed', null, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  return { status: 'processed', eventId };
}

/**
 * Call Flowmingo API to create an Interview Set.
 */
export async function createFlowmingoInterviewSet(payload: {
  title: string;
  set_type?: number;
  description?: string;
  interview_duration?: number;
  cfg_lingual_ids?: number[];
  number_of_retakes?: number;
  priority?: number;
  project_id?: string;
  iai_questions?: any[];
  iai_requirements?: any[];
  com_accesses?: any[];
}) {
  const { apiKey, baseUrl } = config.flowmingo;
  if (!apiKey) {
    throw new HttpError(500, 'Flowmingo API key is not configured in environment.');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/company/integration/interview/set/v1`;
  console.log(`[Flowmingo API] Creating Interview Set at ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[Flowmingo API Error] Create set failed (${res.status}): ${errText}`);
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(res.status, 'Flowmingo API Key is invalid or missing required `create_set` scope.');
    }
    throw new HttpError(res.status, `Flowmingo set creation failed: ${res.statusText} ${errText}`);
  }

  const data = await res.json();
  return data.results;
}

/**
 * Call Flowmingo API to invite candidate(s).
 */
export async function inviteCandidatesFlowmingo(payload: {
  com_interview_set_id?: string;
  com_project_id?: string;
  com_job_post_id?: string;
  candidates: {
    ats_candidate_id?: string;
    email?: string;
    email_address?: string;
    name?: string;
    full_name?: string;
    candidate_name?: string;
    contact_name?: string;
    firstname?: string;
    first_name?: string;
    lastname?: string;
    last_name?: string;
    cv_link?: string;
  }[];
  invitation_message?: string;
  send_invite?: boolean;
}) {
  const { apiKey, baseUrl } = config.flowmingo;
  if (!apiKey) {
    throw new HttpError(500, 'Flowmingo API key is not configured in environment.');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/company/integration/interview/candidate/invite/v1`;
  console.log(`[Flowmingo API] Inviting candidates at ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[Flowmingo API Error] Candidate invite failed (${res.status}): ${errText}`);
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(res.status, 'Flowmingo API Key is invalid or missing required `invite_candidates` scope.');
    }
    throw new HttpError(res.status, `Flowmingo invitation failed: ${res.statusText} ${errText}`);
  }

  const data = await res.json();
  return data.results;
}

/**
 * Fetch live interview sets directly from Flowmingo API.
 */
export async function fetchFlowmingoInterviewSetsFromApi() {
  const { apiKey, baseUrl } = config.flowmingo;
  let apiSets: any[] = [];

  if (apiKey) {
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/company/integration/interview/set/v1`;
      console.log(`[Flowmingo API] Fetching live interview sets from ${url}`);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const rawResults = data.results || data.data || (Array.isArray(data) ? data : []);
        if (Array.isArray(rawResults)) {
          apiSets = rawResults
            .map((item: any) => ({
              id: String(item.id || item.uuid || ''),
              title: item.title || item.name || 'Untitled Flowmingo Set',
              description: item.description || '',
              interview_duration: item.interview_duration,
              created_at: item.created_at,
            }))
            .filter((s: any) => Boolean(s.id));
        }
      } else {
        console.warn(`[Flowmingo API Warning] Could not fetch live sets (${res.status}): ${res.statusText}`);
      }
    } catch (err: any) {
      console.warn(`[Flowmingo API Warning] Error fetching live sets: ${err.message}`);
    }
  }

  // Also query local DB sets as fallback/merge
  const dbSets = await flowmingoRepo.listDbInterviewSets();

  // Merge API sets and DB sets by ID
  const map = new Map<string, { id: string; title: string; job_description_id?: number | null }>();

  // Add DB sets first
  for (const ds of dbSets) {
    if (ds.id) {
      map.set(ds.id, { id: ds.id, title: ds.title, job_description_id: ds.job_description_id });
    }
  }

  // Add/override with API sets
  for (const as of apiSets) {
    if (as.id) {
      const existing = map.get(as.id);
      map.set(as.id, {
        id: as.id,
        title: as.title || existing?.title || 'Flowmingo Interview Set',
        job_description_id: existing?.job_description_id || null,
      });
    }
  }

  return Array.from(map.values());
}
