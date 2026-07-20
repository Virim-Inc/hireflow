import type {
  Candidate,
  CandidateFilters,
  CandidateMeta,
  CandidateStageHistoryItem,
  CandidateStats,
  CandidatesResponse,
  UpdateCandidateStageInput,
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
