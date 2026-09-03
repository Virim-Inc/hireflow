export interface FlowmingoStatusResponse {
  configured: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  baseUrl: string;
  message: string;
}

export interface FlowmingoInvitationRecord {
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
  invited_at: string;
  created_at: string;
  updated_at: string;
  job_title?: string;
}

export interface FlowmingoEvaluationRecord {
  id: number;
  flowmingo_invitation_id: number;
  evaluation_type: 'cv' | 'interview' | 'holistic' | string;
  evaluation_score: number;
  submission_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateFlowmingoDetailsResponse {
  latestInvitation: FlowmingoInvitationRecord | null;
  evaluations: FlowmingoEvaluationRecord[];
  history: FlowmingoInvitationRecord[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('hf_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface FlowmingoInterviewSetOption {
  id: string;
  title: string;
  job_description_id?: number | null;
}

export async function getFlowmingoStatus(): Promise<FlowmingoStatusResponse> {
  const res = await fetch('/api/flowmingo/status', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Flowmingo status (${res.status})`);
  }
  return res.json();
}

export async function getFlowmingoInterviewSets(): Promise<FlowmingoInterviewSetOption[]> {
  const res = await fetch('/api/flowmingo/interview-sets', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Flowmingo interview sets (${res.status})`);
  }
  const data = await res.json();
  return data.interview_sets || [];
}

export async function createFlowmingoInterviewSet(data: {
  jd_id?: number;
  title: string;
  description?: string;
  interview_duration?: number;
  number_of_retakes?: number;
  iai_questions?: any[];
  iai_requirements?: any[];
}) {
  const res = await fetch('/api/flowmingo/interview-sets', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to create interview set (${res.status})`);
  }
  return res.json();
}

export async function inviteCandidatesToFlowmingo(data: {
  com_interview_set_id: string;
  job_description_id?: number;
  candidates: {
    id: number;
    name?: string;
    email: string;
    resume_url?: string;
    cv_link?: string;
  }[];
  invitation_message?: string;
}) {
  const res = await fetch('/api/flowmingo/invite', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to send invitations (${res.status})`);
  }
  return res.json();
}

export async function getCandidateFlowmingoDetails(candidateId: number): Promise<CandidateFlowmingoDetailsResponse> {
  const res = await fetch(`/api/flowmingo/invitations/${candidateId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch candidate Flowmingo details (${res.status})`);
  }
  return res.json();
}
