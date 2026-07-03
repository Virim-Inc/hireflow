import type { CandidateFilters, CandidatesResponse, CandidateStats, Candidate } from '../types/candidate.types';

const BASE = '/api';

// ── Build query string ──────────────────────────────────────────────────────
function buildQuery(filters: Partial<CandidateFilters>): string {
  const params = new URLSearchParams();
  if (filters.search)         params.set('search',         filters.search);
  if (filters.grade)          params.set('grade',          filters.grade);
  if (filters.recommendation) params.set('recommendation', filters.recommendation);
  if (filters.qualified)      params.set('qualified',      filters.qualified);
  if (filters.sort)           params.set('sort',           filters.sort);
  if (filters.order)          params.set('order',          filters.order);
  if (filters.page)           params.set('page',           String(filters.page));
  if (filters.limit)          params.set('limit',          String(filters.limit));
  return params.toString();
}

// ── Fetch candidates list ───────────────────────────────────────────────────
export async function fetchCandidates(
  filters: Partial<CandidateFilters> = {}
): Promise<CandidatesResponse> {
  const qs  = buildQuery(filters);
  const res = await fetch(`${BASE}/candidates${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Fetch single candidate ──────────────────────────────────────────────────
export async function fetchCandidate(id: number): Promise<Candidate> {
  const res = await fetch(`${BASE}/candidates/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Fetch stats ─────────────────────────────────────────────────────────────
export async function fetchStats(): Promise<CandidateStats> {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Check backend health ─────────────────────────────────────────────────────
export async function checkHealth(): Promise<{ status: string; db: string }> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
