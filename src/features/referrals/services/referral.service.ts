import type {
  PartnerCompany,
  CandidateReferral,
  ReferralMetrics,
  ReferralQueryParams,
  ReferralsListResponse,
  CreateReferralPayload,
  ReferralStatus,
  CandidateReferralTag,
} from '../types/referral.types';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('hf_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Fetch all active partner companies.
 */
export async function getPartnerCompanies(): Promise<PartnerCompany[]> {
  const res = await fetch('/api/referrals/companies', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch partner companies' }));
    throw new Error(err.error || 'Failed to fetch partner companies');
  }
  return res.json();
}

export interface CreatePartnerCompanyPayload {
  name: string;
  logo_url?: string;
  website?: string;
  contact_email?: string;
  contact_person?: string;
  industry?: string;
  description?: string;
}

/**
 * Create a new partner company.
 */
export async function createPartnerCompany(payload: CreatePartnerCompanyPayload): Promise<PartnerCompany> {
  const res = await fetch('/api/referrals/companies', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create partner company' }));
    throw new Error(err.error || 'Failed to create partner company');
  }
  return res.json();
}

/**
 * Fetch referral statistics and counters.
 */
export async function getReferralMetrics(): Promise<ReferralMetrics> {
  const res = await fetch('/api/referrals/metrics', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch referral metrics');
  }
  return res.json();
}

/**
 * List candidate referrals with pagination, search, status, and company filters.
 */
export async function getReferrals(params: ReferralQueryParams = {}): Promise<ReferralsListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.company_id) query.set('company_id', String(params.company_id));
  if (params.candidate_id) query.set('candidate_id', String(params.candidate_id));

  const url = `/api/referrals?${query.toString()}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch referrals' }));
    throw new Error(err.error || 'Failed to fetch referrals');
  }
  return res.json();
}

/**
 * Get full referral details including status history timeline.
 */
export async function getReferralById(id: number): Promise<CandidateReferral> {
  const res = await fetch(`/api/referrals/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch referral details' }));
    throw new Error(err.error || 'Failed to fetch referral details');
  }
  return res.json();
}

/**
 * Get referrals for a single candidate.
 */
export async function getReferralsForCandidate(candidateId: number): Promise<CandidateReferral[]> {
  const res = await fetch(`/api/referrals/candidate/${candidateId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

/**
 * Batch fetch active referral tags for candidate IDs.
 */
export async function getCandidateReferralTags(candidateIds: number[]): Promise<Record<number, CandidateReferralTag[]>> {
  if (candidateIds.length === 0) return {};
  const res = await fetch(`/api/referrals/candidate-tags?ids=${candidateIds.join(',')}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    return {};
  }
  return res.json();
}

/**
 * Submit a new candidate referral.
 */
export async function createReferral(payload: CreateReferralPayload): Promise<CandidateReferral> {
  const res = await fetch('/api/referrals', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create candidate referral' }));
    throw new Error(err.error || 'Failed to create candidate referral');
  }
  return res.json();
}

/**
 * Update the status of an existing candidate referral.
 */
export async function updateReferralStatus(
  id: number,
  status: ReferralStatus,
  note?: string,
): Promise<CandidateReferral> {
  const res = await fetch(`/api/referrals/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update referral status' }));
    throw new Error(err.error || 'Failed to update referral status');
  }
  return res.json();
}
