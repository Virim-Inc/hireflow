import type {
  Candidate,
  CandidateFilters,
  CandidateMeta,
  CandidateStageHistoryItem,
  CandidateStats,
  CandidatesResponse,
  UpdateCandidateStageInput,
  JobDescription,
} from '../types/candidate.types';

const BASE = '/api';

function buildQuery(filters: Partial<CandidateFilters>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchCandidates(filters: Partial<CandidateFilters> = {}): Promise<CandidatesResponse> {
  const qs = buildQuery(filters);
  const res = await fetch(`${BASE}/candidates${qs ? `?${qs}` : ''}`);
  return readJson<CandidatesResponse>(res);
}

export async function fetchCandidate(id: number): Promise<Candidate> {
  const res = await fetch(`${BASE}/candidates/${id}`);
  return readJson<Candidate>(res);
}

export async function fetchCandidateHistory(id: number): Promise<CandidateStageHistoryItem[]> {
  const res = await fetch(`${BASE}/candidates/${id}/history`);
  return readJson<CandidateStageHistoryItem[]>(res);
}

export async function fetchCandidateMeta(): Promise<CandidateMeta> {
  const res = await fetch(`${BASE}/candidates/meta`);
  return readJson<CandidateMeta>(res);
}

export async function updateCandidateStage(id: number, input: UpdateCandidateStageInput): Promise<Candidate> {
  const res = await fetch(`${BASE}/candidates/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return readJson<Candidate>(res);
}

export async function bulkUpdateCandidateStage(
  ids: number[],
  input: UpdateCandidateStageInput
): Promise<Candidate[]> {
  return Promise.all(ids.map((id) => updateCandidateStage(id, input)));
}

export async function fetchStats(): Promise<CandidateStats> {
  const res = await fetch(`${BASE}/stats`);
  return readJson<CandidateStats>(res);
}

export async function checkHealth(): Promise<{ status: string; db: string }> {
  const res = await fetch(`${BASE}/health`);
  return readJson<{ status: string; db: string }>(res);
}

export async function fetchJds(filters: { active?: boolean; search?: string } = {}): Promise<JobDescription[]> {
  const params = new URLSearchParams();
  if (filters.active !== undefined) {
    params.append('active', String(filters.active));
  }
  if (filters.search) {
    params.append('q', filters.search);
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE}/job-descriptions${queryString}`);
  return readJson<JobDescription[]>(res);
}

export async function createJd(input: Omit<JobDescription, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<JobDescription> {
  const res = await fetch(`${BASE}/job-descriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readJson<JobDescription>(res);
}

export async function updateJd(id: number, input: Partial<JobDescription>): Promise<JobDescription> {
  const res = await fetch(`${BASE}/job-descriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readJson<JobDescription>(res);
}

export async function deleteJd(id: number): Promise<void> {
  const res = await fetch(`${BASE}/job-descriptions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete job description');
  }
}

export async function toggleJdActive(id: number, active: boolean): Promise<JobDescription> {
  const res = await fetch(`${BASE}/job-descriptions/${id}/toggle-active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: active }),
  });
  return readJson<JobDescription>(res);
}

export async function scheduleCandidateTest(
  id: number,
  data: {
    candidateName?: string;
    candidateEmail?: string;
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes?: number;
    notes?: string;
  },
): Promise<{
  candidate: Candidate;
  emailStatus: { sent: boolean; messageId?: string; simulated?: boolean };
}> {
  const res = await fetch(`${BASE}/candidates/${id}/schedule-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return readJson<{
    candidate: Candidate;
    emailStatus: { sent: boolean; messageId?: string; simulated?: boolean };
  }>(res);
}

