import { pool } from '../config/db.js';
import * as referralsRepo from '../repositories/referrals.repo.js';
import * as candidateRepo from '../repositories/candidate.repo.js';
import * as flowmingoRepo from '../repositories/flowmingo.repo.js';
import { HttpError } from '../middleware/errorHandler.js';
import type {
  CreateReferralDto,
  ReferralStatus,
  CandidateReferral,
  PartnerCompany,
  ReferralMetrics,
  SharedCandidateSnapshot,
} from '../types/referral.types.js';

const VALID_STATUSES: ReferralStatus[] = [
  'shared',
  'under_review',
  'interviewing',
  'offered',
  'hired',
  'declined',
  'withdrawn',
];

/**
 * List all active partner companies.
 */
export async function getPartnerCompanies(): Promise<PartnerCompany[]> {
  return referralsRepo.listPartnerCompanies();
}

/**
  * Create a new partner company.
  */
export async function createPartnerCompany(body: {
  name?: string;
  logo_url?: string;
  website?: string;
  contact_email?: string;
  contact_person?: string;
  industry?: string;
  description?: string;
}): Promise<PartnerCompany> {
  const name = body.name?.trim();
  if (!name) {
    throw new HttpError(400, 'Company name is required.');
  }

  // Generate unique slug
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'company';

  // Check if slug exists, append numeric suffix if needed
  let finalSlug = slug;
  let counter = 1;
  while (true) {
    const existing = await pool.query(
      'SELECT id FROM partner_companies WHERE slug = $1 LIMIT 1',
      [finalSlug],
    );
    if (existing.rows.length === 0) break;
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return referralsRepo.createPartnerCompany({
    name,
    slug: finalSlug,
    logo_url: body.logo_url?.trim() || null,
    website: body.website?.trim() || null,
    contact_email: body.contact_email?.trim() || null,
    contact_person: body.contact_person?.trim() || null,
    industry: body.industry?.trim() || null,
    description: body.description?.trim() || null,
  });
}

/**
 * Get aggregated referral metrics.
 */
export async function getReferralMetrics(): Promise<ReferralMetrics> {
  return referralsRepo.getReferralMetrics();
}

/**
 * List referrals with pagination and filters.
 */
export async function getReferrals(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  companyId?: number;
  candidateId?: number;
}): Promise<{ referrals: CandidateReferral[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const { referrals, total } = await referralsRepo.listReferrals(params);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    referrals,
    total,
    page,
    totalPages,
  };
}

/**
 * Get referral details by ID including history timeline.
 */
export async function getReferralById(id: number) {
  const referral = await referralsRepo.findReferralById(id);
  if (!referral) {
    throw new HttpError(404, 'Referral record not found.');
  }

  const history = await referralsRepo.getReferralStatusHistory(id);
  return {
    ...referral,
    history,
  };
}

/**
 * Get all referrals for a candidate.
 */
export async function getReferralsForCandidate(candidateId: number): Promise<CandidateReferral[]> {
  return referralsRepo.findReferralsByCandidateId(candidateId);
}

/**
 * Create a new candidate referral.
 */
export async function createReferral(dto: CreateReferralDto, referredById: number | null): Promise<CandidateReferral> {
  if (!dto.candidate_id) {
    throw new HttpError(400, 'Candidate ID is required.');
  }
  if (!dto.company_id) {
    throw new HttpError(400, 'Partner Company ID is required.');
  }
  if (!dto.overall_review || !dto.overall_review.trim()) {
    throw new HttpError(400, 'Overall review and recommendation notes are required.');
  }

  // 1. Validate candidate existence
  const client = await pool.connect();
  try {
    const candidate = await candidateRepo.findCandidateById(client, dto.candidate_id);
    if (!candidate) {
      throw new HttpError(404, `Candidate #${dto.candidate_id} not found.`);
    }

    // 2. Validate partner company existence & active status
    const company = await referralsRepo.findCompanyById(dto.company_id);
    if (!company) {
      throw new HttpError(404, `Partner company #${dto.company_id} not found.`);
    }
    if (!company.is_active) {
      throw new HttpError(400, `Partner company "${company.name}" is currently inactive.`);
    }

    // 3. Enforce duplicate active referral check
    const existingActive = await referralsRepo.findActiveReferral(dto.candidate_id, dto.company_id);
    if (existingActive) {
      throw new HttpError(
        409,
        `Candidate is already actively referred to ${company.name} (Current Status: "${existingActive.status}").`,
      );
    }

    // 4. Construct server-side immutable candidate snapshot
    const flowmingoDetails = await flowmingoRepo.getCandidateFlowmingoDetails(dto.candidate_id);
    const flowmingoScore = flowmingoDetails?.evaluations?.[0]?.evaluation_score != null
      ? Number(flowmingoDetails.evaluations[0].evaluation_score)
      : null;

    const splitSkills = (val?: string | null) =>
      val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];

    const snapshot: SharedCandidateSnapshot = {
      candidate_name: candidate.candidate_name,
      email: candidate.email,
      phone: candidate.phone || null,
      position_label: candidate.position_label || null,
      years_of_exp: candidate.years_of_exp || null,
      skills: {
        frontend: splitSkills(candidate.frontend_skills),
        backend: splitSkills(candidate.backend_skills),
        database: splitSkills(candidate.database_skills),
        ai_ml: splitSkills(candidate.ai_ml_skills),
        cloud_devops: splitSkills(candidate.cloud_devops),
        languages: splitSkills(candidate.programming_langs),
      },
      scores: {
        technical_score: candidate.best_score != null ? Number(candidate.best_score) : null,
        overall_score: candidate.best_score != null ? Number(candidate.best_score) : null,
        flowmingo_score: flowmingoScore,
      },
      education: candidate.highest_degree || null,
      linkedin: candidate.linkedin || null,
      source: candidate.source || null,
      snapshot_created_at: new Date().toISOString(),
    };

    // 5. Transaction: Create referral and insert initial status history
    await client.query('BEGIN');
    const referral = await referralsRepo.createReferral(dto, snapshot, referredById, client);
    await referralsRepo.insertStatusHistory(
      referral.id,
      null,
      'shared',
      referredById,
      'Candidate referred and shared with partner company.',
      client,
    );
    await client.query('COMMIT');

    const enriched = await referralsRepo.findReferralById(referral.id);
    return enriched || referral;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Transition referral status and record audit timeline history.
 */
export async function updateReferralStatus(
  id: number,
  newStatus: ReferralStatus,
  note?: string,
  changedById?: number | null,
): Promise<CandidateReferral> {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new HttpError(400, `Invalid referral status "${newStatus}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const existing = await referralsRepo.findReferralById(id);
  if (!existing) {
    throw new HttpError(404, 'Referral record not found.');
  }

  if (existing.status === newStatus && !note) {
    return existing;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await referralsRepo.updateReferralStatus(id, newStatus, note, client);
    await referralsRepo.insertStatusHistory(id, existing.status, newStatus, changedById || null, note, client);
    await client.query('COMMIT');

    const enriched = await referralsRepo.findReferralById(id);
    return enriched || updated;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
