export interface PartnerCompany {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  contact_person: string | null;
  industry: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ReferralStatus =
  | 'shared'
  | 'under_review'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'declined'
  | 'withdrawn';

export interface ReferralRound {
  name: string;
  cleared: boolean;
  score?: number | null;
  notes?: string | null;
}

export interface SharedCandidateSnapshot {
  candidate_name: string;
  email: string;
  phone?: string | null;
  position_label?: string | null;
  years_of_exp?: number | null;
  skills?: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    ai_ml?: string[];
    cloud_devops?: string[];
    languages?: string[];
  };
  scores?: {
    technical_score?: number | null;
    overall_score?: number | null;
    flowmingo_score?: number | null;
  };
  education?: string | null;
  linkedin?: string | null;
  source?: string | null;
  snapshot_created_at: string;
}

export interface ReferralStatusHistory {
  id: number;
  referral_id: number;
  old_status: string | null;
  new_status: string;
  changed_by_id: number | null;
  changed_by_name?: string | null;
  note: string | null;
  created_at: string;
}

export interface CandidateReferral {
  id: number;
  candidate_id: number;
  company_id: number;
  referred_by_id: number | null;
  rounds_cleared: ReferralRound[];
  overall_review: string;
  key_strengths: string | null;
  suggested_roles: string | null;
  notes: string | null;
  status: ReferralStatus;
  shared_candidate_snapshot: SharedCandidateSnapshot;
  created_at: string;
  updated_at: string;

  // Joined fields
  candidate_name?: string;
  candidate_email?: string;
  candidate_position?: string;
  company_name?: string;
  company_slug?: string;
  company_logo_url?: string | null;
  company_industry?: string | null;
  referred_by_name?: string | null;
  referred_by_email?: string | null;

  // Optional history loaded on detail
  history?: ReferralStatusHistory[];
}

export interface CreateReferralPayload {
  candidate_id: number;
  company_id: number;
  rounds: ReferralRound[];
  overall_review: string;
  key_strengths?: string;
  suggested_roles?: string;
  notes?: string;
}

export interface ReferralMetrics {
  total_referrals: number;
  under_review: number;
  interviewing: number;
  offered: number;
  hired: number;
  declined: number;
  total_companies: number;
}

export interface ReferralQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  company_id?: number;
  candidate_id?: number;
}

export interface ReferralsListResponse {
  referrals: CandidateReferral[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CandidateReferralTag {
  company_id: number;
  company_name: string;
  status: string;
  logo_url: string | null;
}
