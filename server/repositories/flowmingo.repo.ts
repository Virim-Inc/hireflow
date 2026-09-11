import { PoolClient } from 'pg';
import { pool } from '../config/db.js';

export interface FlowmingoWebhookEventRow {
  id: number;
  event_id: string;
  event_type: string;
  schema_version: string;
  organization_id: number | null;
  payload: any;
  processing_status: 'received' | 'processing' | 'processed' | 'failed';
  error_message: string | null;
  received_at: Date;
  processed_at: Date | null;
}

export interface FlowmingoInvitationRow {
  id: number;
  candidate_id: number;
  job_description_id: number | null;
  flowmingo_interview_set_id: string;
  flowmingo_candidate_id: string | null;
  flowmingo_invitation_id: string | null;
  flowmingo_submission_id: string | null;
  invitation_status: string;
  interview_status: string | null;
  invitation_message: string | null;
  submission_url: string | null;
  invited_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FlowmingoEvaluationRow {
  id: number;
  flowmingo_invitation_id: number;
  evaluation_type: string;
  evaluation_score: number;
  submission_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Check if a webhook event ID has already been recorded.
 */
export async function getWebhookEventById(eventId: string, client?: PoolClient): Promise<FlowmingoWebhookEventRow | null> {
  const sql = `SELECT * FROM flowmingo_webhook_events WHERE event_id = $1 LIMIT 1`;
  const res = client ? await client.query(sql, [eventId]) : await pool.query(sql, [eventId]);
  return (res.rows[0] as FlowmingoWebhookEventRow) || null;
}

/**
 * Log an incoming webhook event.
 */
export async function insertWebhookEvent(
  eventId: string,
  eventType: string,
  schemaVersion: string,
  organizationId: number | null,
  payload: any,
  status: 'processing' | 'processed' | 'failed' = 'processing',
  client?: PoolClient,
): Promise<FlowmingoWebhookEventRow> {
  const sql = `
    INSERT INTO flowmingo_webhook_events 
      (event_id, event_type, schema_version, organization_id, payload, processing_status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const res = client 
    ? await client.query(sql, [eventId, eventType, schemaVersion, organizationId, payload, status])
    : await pool.query(sql, [eventId, eventType, schemaVersion, organizationId, payload, status]);
  return res.rows[0] as FlowmingoWebhookEventRow;
}

/**
 * Update processing status of a webhook event.
 */
export async function updateWebhookEventStatus(
  eventId: string,
  status: 'processed' | 'failed',
  errorMessage: string | null = null,
  client?: PoolClient,
): Promise<void> {
  const sql = `
    UPDATE flowmingo_webhook_events
    SET processing_status = $2, error_message = $3, processed_at = CURRENT_TIMESTAMP
    WHERE event_id = $1
  `;
  if (client) {
    await client.query(sql, [eventId, status, errorMessage]);
  } else {
    await pool.query(sql, [eventId, status, errorMessage]);
  }
}

/**
 * Save candidate invitation record.
 */
export async function createInvitationRecord(
  data: {
    candidate_id: number;
    job_description_id?: number | null;
    flowmingo_interview_set_id: string;
    flowmingo_candidate_id?: string | null;
    flowmingo_invitation_id?: string | null;
    flowmingo_submission_id?: string | null;
    invitation_status?: string;
    invitation_message?: string | null;
  },
  client?: PoolClient,
): Promise<FlowmingoInvitationRow> {
  const exec = async (queryText: string, params: any[]) => {
    const res = client ? await client.query(queryText, params) : await pool.query(queryText, params);
    return res.rows;
  };

  // Check if an invitation record already exists with this submission_id
  if (data.flowmingo_submission_id) {
    const existing = await exec(
      `SELECT * FROM flowmingo_invitations WHERE flowmingo_submission_id = $1`,
      [data.flowmingo_submission_id],
    );
    if (existing.length > 0) {
      const updateRes = await exec(
        `UPDATE flowmingo_invitations
         SET candidate_id = $2,
             job_description_id = COALESCE($3, job_description_id),
             flowmingo_interview_set_id = $4,
             flowmingo_candidate_id = COALESCE($5, flowmingo_candidate_id),
             flowmingo_invitation_id = COALESCE($6, flowmingo_invitation_id),
             invitation_status = $7,
             invitation_message = COALESCE($8, invitation_message),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [
          existing[0].id,
          data.candidate_id,
          data.job_description_id || null,
          data.flowmingo_interview_set_id,
          data.flowmingo_candidate_id || null,
          data.flowmingo_invitation_id || null,
          data.invitation_status || 'pending',
          data.invitation_message || null,
        ],
      );
      return updateRes[0] as FlowmingoInvitationRow;
    }
  }

  // Check if an invitation record already exists with this invitation_id
  if (data.flowmingo_invitation_id) {
    const existing = await exec(
      `SELECT * FROM flowmingo_invitations WHERE flowmingo_invitation_id = $1`,
      [data.flowmingo_invitation_id],
    );
    if (existing.length > 0) {
      const updateRes = await exec(
        `UPDATE flowmingo_invitations
         SET candidate_id = $2,
             job_description_id = COALESCE($3, job_description_id),
             flowmingo_interview_set_id = $4,
             flowmingo_candidate_id = COALESCE($5, flowmingo_candidate_id),
             flowmingo_submission_id = COALESCE($6, flowmingo_submission_id),
             invitation_status = $7,
             invitation_message = COALESCE($8, invitation_message),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [
          existing[0].id,
          data.candidate_id,
          data.job_description_id || null,
          data.flowmingo_interview_set_id,
          data.flowmingo_candidate_id || null,
          data.flowmingo_submission_id || null,
          data.invitation_status || 'pending',
          data.invitation_message || null,
        ],
      );
      return updateRes[0] as FlowmingoInvitationRow;
    }
  }

  // Insert fresh record
  const insertSql = `
    INSERT INTO flowmingo_invitations (
      candidate_id, job_description_id, flowmingo_interview_set_id,
      flowmingo_candidate_id, flowmingo_invitation_id, flowmingo_submission_id,
      invitation_status, invitation_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const insertParams = [
    data.candidate_id,
    data.job_description_id || null,
    data.flowmingo_interview_set_id,
    data.flowmingo_candidate_id || null,
    data.flowmingo_invitation_id || null,
    data.flowmingo_submission_id || null,
    data.invitation_status || 'pending',
    data.invitation_message || null,
  ];
  const res = await exec(insertSql, insertParams);
  return res[0] as FlowmingoInvitationRow;
}

/**
 * Resolve target Flowmingo invitation with ambiguity protection.
 */
export async function resolveTargetInvitation(
  flowmingoCandidateId: string | null,
  interviewSetId: string | null,
  candidateEmail: string | null,
  client?: PoolClient,
): Promise<FlowmingoInvitationRow | null> {
  const exec = async (sql: string, params: any[]) => {
    const res = client ? await client.query(sql, params) : await pool.query(sql, params);
    return res.rows as FlowmingoInvitationRow[];
  };

  // Priority 1: Match by flowmingo_candidate_id if present
  if (flowmingoCandidateId) {
    const rows = await exec(
      `SELECT fi.* FROM flowmingo_invitations fi WHERE fi.flowmingo_candidate_id = $1 ORDER BY fi.created_at DESC`,
      [flowmingoCandidateId],
    );
    if (rows.length > 0) return rows[0];
  }

  // Priority 2: Match by flowmingo_interview_set_id + candidate email
  if (interviewSetId && candidateEmail) {
    const rows = await exec(
      `SELECT fi.* FROM flowmingo_invitations fi 
       JOIN candidates c ON fi.candidate_id = c.id
       WHERE fi.flowmingo_interview_set_id = $1 AND LOWER(c.email) = LOWER($2)
       ORDER BY fi.created_at DESC`,
      [interviewSetId, candidateEmail],
    );
    if (rows.length > 0) return rows[0];
  }

  // Priority 3: Fallback match by candidate email
  if (candidateEmail) {
    const rows = await exec(
      `SELECT fi.* FROM flowmingo_invitations fi 
       JOIN candidates c ON fi.candidate_id = c.id
       WHERE LOWER(c.email) = LOWER($1)
       ORDER BY fi.created_at DESC`,
      [candidateEmail],
    );
    if (rows.length > 0) return rows[0];

    // Check if candidate exists in HireFlow candidates table directly
    const candSql = `SELECT id FROM candidates WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`;
    const candRes = client ? await client.query(candSql, [candidateEmail]) : await pool.query(candSql, [candidateEmail]);
    if (candRes.rows.length > 0) {
      const candId = candRes.rows[0].id;
      return createInvitationRecord(
        {
          candidate_id: candId,
          flowmingo_interview_set_id: interviewSetId || 'flowmingo-set',
          flowmingo_candidate_id: flowmingoCandidateId || null,
          invitation_status: 'invited',
        },
        client,
      );
    }
  }

  return null;
}

/**
 * Populate flowmingo_candidate_id if currently null.
 */
export async function populateCandidateIdIfNull(
  invitationRecordId: number,
  flowmingoCandidateId: string,
  client?: PoolClient,
): Promise<void> {
  const sql = `
    UPDATE flowmingo_invitations 
    SET flowmingo_candidate_id = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $1 AND flowmingo_candidate_id IS NULL
  `;
  if (client) {
    await client.query(sql, [invitationRecordId, flowmingoCandidateId]);
  } else {
    await pool.query(sql, [invitationRecordId, flowmingoCandidateId]);
  }
}

/**
 * Update invitation status.
 */
export async function updateInvitationStatus(
  invitationRecordId: number,
  status: string,
  client?: PoolClient,
): Promise<void> {
  const sql = `
    UPDATE flowmingo_invitations 
    SET invitation_status = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $1
  `;
  if (client) {
    await client.query(sql, [invitationRecordId, status]);
  } else {
    await pool.query(sql, [invitationRecordId, status]);
  }
}

/**
 * Update interview status.
 */
export async function updateInterviewStatus(
  invitationRecordId: number,
  status: string,
  client?: PoolClient,
): Promise<void> {
  const sql = `
    UPDATE flowmingo_invitations 
    SET interview_status = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $1
  `;
  if (client) {
    await client.query(sql, [invitationRecordId, status]);
  } else {
    await pool.query(sql, [invitationRecordId, status]);
  }
}

/**
 * Upsert evaluation score (CV, Interview, Holistic).
 */
export async function upsertEvaluation(
  invitationRecordId: number,
  evaluationType: string,
  evaluationScore: number,
  submissionUrl: string | null,
  client?: PoolClient,
): Promise<FlowmingoEvaluationRow> {
  // Ensure score is constrained between 0.00 and 10.00
  const normalizedScore = Math.max(0, Math.min(10, evaluationScore));
  const sql = `
    INSERT INTO flowmingo_evaluations (flowmingo_invitation_id, evaluation_type, evaluation_score, submission_url)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (flowmingo_invitation_id, evaluation_type) 
    DO UPDATE SET evaluation_score = EXCLUDED.evaluation_score, 
                  submission_url = COALESCE(EXCLUDED.submission_url, flowmingo_evaluations.submission_url),
                  updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const res = client
    ? await client.query(sql, [invitationRecordId, evaluationType, normalizedScore, submissionUrl])
    : await pool.query(sql, [invitationRecordId, evaluationType, normalizedScore, submissionUrl]);
  return res.rows[0] as FlowmingoEvaluationRow;
}

/**
 * Get all Flowmingo invitations and evaluations for a candidate.
 */
export async function getCandidateFlowmingoDetails(candidateId: number) {
  const invRes = await pool.query(
    `SELECT fi.*, jd.title as job_title
     FROM flowmingo_invitations fi
     LEFT JOIN job_descriptions jd ON fi.job_description_id = jd.id
     WHERE fi.candidate_id = $1
     ORDER BY fi.created_at DESC`,
    [candidateId],
  );

  const invitations = invRes.rows as (FlowmingoInvitationRow & { job_title: string | null })[];
  if (invitations.length === 0) {
    return { latestInvitation: null, evaluations: [], history: [] };
  }

  // Fetch all evaluations for this candidate across all invitation rows
  const evalRes = await pool.query(
    `SELECT fe.* 
     FROM flowmingo_evaluations fe
     JOIN flowmingo_invitations fi ON fe.flowmingo_invitation_id = fi.id
     WHERE fi.candidate_id = $1
     ORDER BY fe.created_at DESC`,
    [candidateId],
  );

  const evaluations = evalRes.rows as FlowmingoEvaluationRow[];
  const latest = { ...invitations[0] };

  // If latest invitation doesn't have submission_url, fallback to evaluation submission_url
  if (!latest.submission_url && evaluations.length > 0 && evaluations[0].submission_url) {
    latest.submission_url = evaluations[0].submission_url;
  }

  // If evaluations exist, ensure interview status reflects completed
  if (evaluations.length > 0 && (!latest.interview_status || latest.interview_status !== 'completed')) {
    latest.interview_status = 'completed';
  }

  return {
    latestInvitation: latest,
    evaluations,
    history: invitations,
  };
}

/**
 * Link Flowmingo set ID to JD.
 */
export async function setJdFlowmingoSetId(jdId: number, flowmingoSetId: string): Promise<void> {
  await pool.query(
    `UPDATE job_descriptions SET flowmingo_interview_set_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [jdId, flowmingoSetId],
  );
}

/**
 * List local interview sets from DB as fallback.
 */
export async function listDbInterviewSets(): Promise<{ id: string; title: string; job_description_id: number | null }[]> {
  const sql = `
    SELECT DISTINCT ON (id) id, title, job_description_id FROM (
      SELECT 
        jd.flowmingo_interview_set_id as id,
        jd.title as title,
        jd.id as job_description_id,
        jd.created_at
      FROM job_descriptions jd
      WHERE jd.flowmingo_interview_set_id IS NOT NULL AND TRIM(jd.flowmingo_interview_set_id) != ''
      UNION
      SELECT 
        fi.flowmingo_interview_set_id as id,
        COALESCE(jd.title, 'Flowmingo Interview Set') as title,
        fi.job_description_id,
        fi.created_at
      FROM flowmingo_invitations fi
      LEFT JOIN job_descriptions jd ON fi.job_description_id = jd.id
      WHERE fi.flowmingo_interview_set_id IS NOT NULL AND TRIM(fi.flowmingo_interview_set_id) != ''
    ) combined
    ORDER BY id, created_at DESC
  `;
  const res = await pool.query(sql);
  return res.rows;
}
