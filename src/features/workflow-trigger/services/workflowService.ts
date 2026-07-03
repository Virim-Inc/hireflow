import type { WorkflowFormData, WorkflowResult } from '../types/workflow.types';

// ─────────────────────────────────────────────────────────────────────────────
// n8n Form Trigger URL structure
//
//  Form Trigger node "path" parameter: c988a28f-613a-4605-bdb8-4093f36fb987
//
//  n8n listens on:
//    GET  /form/<path>        → renders n8n's own form HTML page
//    POST /form/<path>        → PRODUCTION: receives form submission (workflow must be ACTIVE)
//    POST /form-test/<path>   → TEST MODE:  receives form submission (workflow open in n8n UI)
//
//  Vite proxies /n8n/* → http://localhost:5678/* (no CORS, see vite.config.ts)
// ─────────────────────────────────────────────────────────────────────────────
const FORM_PATH = 'c988a28f-613a-4605-bdb8-4093f36fb987';

const PROD_URL      = `/n8n/form/${FORM_PATH}`;       // workflow ACTIVE (green toggle)
const TEST_URL      = `/n8n/form-test/${FORM_PATH}`;  // workflow open in n8n editor

// ── Main submit function ───────────────────────────────────────────────────

export async function submitToWorkflow(data: WorkflowFormData): Promise<WorkflowResult> {
  // Try production endpoint first
  let res = await postForm(PROD_URL, data);

  // n8n returns 404 when no active listener → fall back to test-mode URL
  if (res.status === 404) {
    console.info('[WorkflowService] Production form not found — trying test mode URL');
    res = await postForm(TEST_URL, data);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Log full body so developer can see exactly which node failed
    console.error('[WorkflowService] n8n error response:', res.status, body);
    throw new Error(buildErrorMessage(res.status, body));
  }

  // Parse JSON — n8n's "Respond to Webhook" node returns JSON directly.
  // Handle both array-wrapped and flat object forms.
  const contentType = res.headers.get('content-type') ?? '';
  let json: unknown;

  if (contentType.includes('application/json')) {
    json = await res.json();
  } else {
    const text = await res.text();
    // n8n sometimes returns HTML "success" page when responseMode is wrong
    if (text.trim().startsWith('<')) {
      throw new Error(
        'n8n returned an HTML page instead of JSON. ' +
        'Make sure the workflow has a "Respond to Webhook" node connected after scoring, ' +
        'and responseMode is set to "responseNode" on the Form Trigger.'
      );
    }
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`n8n returned unexpected response: ${text.slice(0, 300)}`);
    }
  }

  return extractResult(json);
}

// ── POST helper ────────────────────────────────────────────────────────────

async function postForm(url: string, data: WorkflowFormData): Promise<Response> {
  const fd = new FormData();
  // Field names must match EXACTLY the "fieldLabel" values in the n8n Form Trigger node
  fd.append('Full Name',             data.fullName);
  fd.append('Email Address',         data.email);
  fd.append('Phone Number',          data.phone);
  fd.append('Position Applied For',  data.position);
  fd.append('Years of Experience',   String(data.yearsOfExperience));
  fd.append('LinkedIn Profile',      data.linkedin);
  if (data.resume) {
    fd.append('Upload Resume', data.resume, data.resume.name);
  }
  return fetch(url, { method: 'POST', body: fd });
}

// ── Human-readable error messages ─────────────────────────────────────────

function buildErrorMessage(status: number, body: string): string {
  if (status === 0) {
    return 'Cannot reach n8n. Is it running at http://localhost:5678? Check your .env.local → VITE_N8N_URL.';
  }
  if (status === 404) {
    return (
      'n8n form not found (404). Fix one of:\n' +
      '• Activate the workflow (green toggle in n8n)\n' +
      '• OR open the workflow in n8n editor and click "Test workflow"'
    );
  }
  if (status === 500) {
    return (
      `Workflow node failed (HTTP 500).\n` +
      `Check n8n → Executions tab to see which node errored.\n` +
      `Common fixes:\n` +
      `• Re-import the updated final__ (11).json (fixes binaryPropertyName bug)\n` +
      `• Verify OpenRouter API credentials in n8n\n` +
      `• Check Google Sheets credentials in n8n\n` +
      `Raw: ${body.slice(0, 150)}`
    );
  }
  return `Workflow returned HTTP ${status}: ${body.slice(0, 200)}`;
}

// ── Extract result from various n8n response shapes ───────────────────────
//
//  n8n "Respond to Webhook" (allIncomingItems) wraps output as:
//    [ { json: { totalScore: 82, ... } } ]
//
//  Direct object (custom body):
//    { totalScore: 82, ... }

function extractResult(raw: unknown): WorkflowResult {
  let data: Record<string, unknown> = {};

  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as Record<string, unknown>;
    // Unwrap n8n item envelope { json: {...} }
    data = (first.json as Record<string, unknown>) ?? first;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    data = (obj.json as Record<string, unknown>) ?? obj;
  }

  return normalise(data);
}

// ── Normalise raw n8n output → WorkflowResult ─────────────────────────────

function normalise(raw: Record<string, unknown>): WorkflowResult {
  const num = (v: unknown, fallback = 0): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const str = (v: unknown, fallback = ''): string =>
    v !== null && v !== undefined ? String(v) : fallback;
  const bool = (v: unknown): boolean =>
    v === true || v === 'true' || v === 1;

  return {
    candidateName:    str(raw.candidateName, 'Unknown'),
    email:            str(raw.email),
    phone:            str(raw.phone, 'N/A'),
    position:         str(raw.position),
    yearsOfExp:       num(raw.yearsOfExp),
    linkedin:         str(raw.linkedin, 'N/A'),
    source:           str(raw.source, 'form'),
    submittedAt:      str(raw.submittedAt, new Date().toISOString()),
    processedAt:      str(raw.processedAt, new Date().toISOString()),

    frontendSkills:   str(raw.frontendSkills,  'N/A'),
    frontendLevel:    str(raw.frontendLevel,   'N/A'),
    backendSkills:    str(raw.backendSkills,   'N/A'),
    backendLevel:     str(raw.backendLevel,    'N/A'),
    databaseSkills:   str(raw.databaseSkills,  'N/A'),
    databaseLevel:    str(raw.databaseLevel,   'N/A'),
    aiMlSkills:       str(raw.aiMlSkills,      'N/A'),
    aiMlLevel:        str(raw.aiMlLevel,       'N/A'),
    cloudDevOps:      str(raw.cloudDevOps,     'N/A'),
    programmingLangs: str(raw.programmingLangs,'N/A'),
    notableProjects:  str(raw.notableProjects, 'N/A'),
    certifications:   str(raw.certifications,  'N/A'),
    currentJobTitle:  str(raw.currentJobTitle, 'N/A'),
    highestDegree:    str(raw.highestDegree,   'N/A'),

    totalScore:       num(raw.totalScore),
    frontendScore:    num(raw.frontendScore),
    backendScore:     num(raw.backendScore),
    databaseScore:    num(raw.databaseScore),
    aiMlScore:        num(raw.aiMlScore),
    expScore:         num(raw.expScore),
    softScore:        num(raw.softScore),
    grade:            str(raw.grade,           'N/A'),
    recommendation:   str(raw.recommendation,  'N/A'),
    isQualified:      bool(raw.isQualified),

    summary:          str(raw.summary),
    strengths:        str(raw.strengths),
    weaknesses:       str(raw.weaknesses),
    frontendFeedback: str(raw.frontendFeedback),
    backendFeedback:  str(raw.backendFeedback),
    databaseFeedback: str(raw.databaseFeedback),
    aiMlFeedback:     str(raw.aiMlFeedback),
    hiringNote:       str(raw.hiringNote),
  };
}
