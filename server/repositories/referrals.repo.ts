import { pool } from '../config/db.js';
import type { PoolClient } from 'pg';
import type {
  PartnerCompany,
  CandidateReferral,
  ReferralStatusHistory,
  CreateReferralDto,
  ReferralStatus,
  SharedCandidateSnapshot,
  ReferralMetrics,
} from '../types/referral.types.js';

/**
 * List all active partner companies.
 */
export async function listPartnerCompanies(): Promise<PartnerCompany[]> {
  const sql = `
    SELECT * FROM partner_companies 
    WHERE is_active = true 
    ORDER BY name ASC
  `;
  const res = await pool.query(sql);
  return res.rows;
}

/**
 * Insert a new partner company.
 */
export async function createPartnerCompany(data: {
  name: string;
  slug: string;
  logo_url?: string | null;
  website?: string | null;
  contact_email?: string | null;
  contact_person?: string | null;
  industry?: string | null;
  description?: string | null;
}): Promise<PartnerCompany> {
  const sql = `
    INSERT INTO partner_companies (name, slug, logo_url, website, contact_email, contact_person, industry, description, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
    RETURNING *
  `;
  const values = [
    data.name,
    data.slug,
    data.logo_url || null,
    data.website || null,
    data.contact_email || null,
    data.contact_person || null,
    data.industry || null,
    data.description || null,
  ];
  const res = await pool.query(sql, values);
  return res.rows[0];
}

/**
 * Find partner company by ID.
 */
export async function findCompanyById(id: number): Promise<PartnerCompany | null> {
  const sql = `SELECT * FROM partner_companies WHERE id = $1`;
  const res = await pool.query(sql, [id]);
  return res.rows[0] || null;
}

/**
 * Check if candidate already has an active referral to a company.
 */
export async function findActiveReferral(candidateId: number, companyId: number): Promise<CandidateReferral | null> {
  const sql = `
    SELECT * FROM candidate_referrals 
    WHERE candidate_id = $1 
      AND company_id = $2 
      AND status NOT IN ('declined', 'withdrawn')
    LIMIT 1
  `;
  const res = await pool.query(sql, [candidateId, companyId]);
  return res.rows[0] || null;
}

/**
 * List referrals with joined candidate, company, and recruiter details.
 */
export async function listReferrals(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  companyId?: number;
  candidateId?: number;
}): Promise<{ referrals: CandidateReferral[]; total: number }> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (params.search?.trim()) {
    conditions.push(`(
      c.candidate_name ILIKE $${paramIdx} OR 
      c.email ILIKE $${paramIdx} OR 
      pc.name ILIKE $${paramIdx} OR 
      cr.suggested_roles ILIKE $${paramIdx}
    )`);
    values.push(`%${params.search.trim()}%`);
    paramIdx++;
  }

  if (params.status?.trim() && params.status !== 'all') {
    conditions.push(`cr.status = $${paramIdx}`);
    values.push(params.status.trim());
    paramIdx++;
  }

  if (params.companyId) {
    conditions.push(`cr.company_id = $${paramIdx}`);
    values.push(params.companyId);
    paramIdx++;
  }

  if (params.candidateId) {
    conditions.push(`cr.candidate_id = $${paramIdx}`);
    values.push(params.candidateId);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count query
  const countSql = `
    SELECT COUNT(*)::int as count
    FROM candidate_referrals cr
    JOIN candidates c ON cr.candidate_id = c.id
    JOIN partner_companies pc ON cr.company_id = pc.id
    ${whereClause}
  `;
  const countRes = await pool.query(countSql, values);
  const total = countRes.rows[0]?.count || 0;

  // Data query
  const dataSql = `
    SELECT 
      cr.*,
      c.candidate_name,
      c.email as candidate_email,
      COALESCE(NULLIF(TRIM(c.position), ''), 'Unassigned role') as candidate_position,
      pc.name as company_name,
      pc.slug as company_slug,
      pc.logo_url as company_logo_url,
      pc.industry as company_industry,
      au.name as referred_by_name,
      au.email as referred_by_email
    FROM candidate_referrals cr
    JOIN candidates c ON cr.candidate_id = c.id
    JOIN partner_companies pc ON cr.company_id = pc.id
    LEFT JOIN admin_users au ON cr.referred_by_id = au.id
    ${whereClause}
    ORDER BY cr.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  const dataRes = await pool.query(dataSql, [...values, limit, offset]);

  return {
    referrals: dataRes.rows,
    total,
  };
}

/**
 * Get referral by ID with candidate and company details.
 */
export async function findReferralById(id: number): Promise<CandidateReferral | null> {
  const sql = `
    SELECT 
      cr.*,
      c.candidate_name,
      c.email as candidate_email,
      COALESCE(NULLIF(TRIM(c.position), ''), 'Unassigned role') as candidate_position,
      pc.name as company_name,
      pc.slug as company_slug,
      pc.logo_url as company_logo_url,
      pc.industry as company_industry,
      au.name as referred_by_name,
      au.email as referred_by_email
    FROM candidate_referrals cr
    JOIN candidates c ON cr.candidate_id = c.id
    JOIN partner_companies pc ON cr.company_id = pc.id
    LEFT JOIN admin_users au ON cr.referred_by_id = au.id
    WHERE cr.id = $1
  `;
  const res = await pool.query(sql, [id]);
  return res.rows[0] || null;
}

/**
 * Get all referrals for a specific candidate.
 */
export async function findReferralsByCandidateId(candidateId: number): Promise<CandidateReferral[]> {
  const sql = `
    SELECT 
      cr.*,
      c.candidate_name,
      c.email as candidate_email,
      COALESCE(NULLIF(TRIM(c.position), ''), 'Unassigned role') as candidate_position,
      pc.name as company_name,
      pc.slug as company_slug,
      pc.logo_url as company_logo_url,
      pc.industry as company_industry,
      au.name as referred_by_name
    FROM candidate_referrals cr
    JOIN candidates c ON cr.candidate_id = c.id
    JOIN partner_companies pc ON cr.company_id = pc.id
    LEFT JOIN admin_users au ON cr.referred_by_id = au.id
    WHERE cr.candidate_id = $1
    ORDER BY cr.created_at DESC
  `;
  const res = await pool.query(sql, [candidateId]);
  return res.rows;
}

/**
 * Get active referral company names map for a list of candidate IDs.
 */
export async function getActiveReferralCompaniesForCandidates(candidateIds: number[]): Promise<Record<number, { company_id: number; company_name: string; status: string; logo_url: string | null }[]>> {
  if (candidateIds.length === 0) return {};

  const sql = `
    SELECT 
      cr.candidate_id,
      cr.company_id,
      cr.status,
      pc.name as company_name,
      pc.logo_url
    FROM candidate_referrals cr
    JOIN partner_companies pc ON cr.company_id = pc.id
    WHERE cr.candidate_id = ANY($1::int[])
      AND cr.status NOT IN ('declined', 'withdrawn')
    ORDER BY cr.created_at DESC
  `;
  const res = await pool.query(sql, [candidateIds]);

  const map: Record<number, { company_id: number; company_name: string; status: string; logo_url: string | null }[]> = {};
  for (const row of res.rows) {
    if (!map[row.candidate_id]) map[row.candidate_id] = [];
    map[row.candidate_id].push({
      company_id: row.company_id,
      company_name: row.company_name,
      status: row.status,
      logo_url: row.logo_url,
    });
  }
  return map;
}

/**
 * Create a new candidate referral record.
 */
export async function createReferral(
  dto: CreateReferralDto,
  snapshot: SharedCandidateSnapshot,
  referredById: number | null,
  client?: PoolClient,
): Promise<CandidateReferral> {
  const runner = client || pool;
  const sql = `
    INSERT INTO candidate_referrals (
      candidate_id,
      company_id,
      referred_by_id,
      rounds_cleared,
      overall_review,
      key_strengths,
      suggested_roles,
      notes,
      status,
      shared_candidate_snapshot
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'shared', $9)
    RETURNING *
  `;
  const res = await runner.query(sql, [
    dto.candidate_id,
    dto.company_id,
    referredById,
    JSON.stringify(dto.rounds || []),
    dto.overall_review,
    dto.key_strengths || null,
    dto.suggested_roles || null,
    dto.notes || null,
    JSON.stringify(snapshot),
  ]);
  return res.rows[0];
}

/**
 * Update referral status.
 */
export async function updateReferralStatus(
  id: number,
  status: ReferralStatus,
  notes?: string,
  client?: PoolClient,
): Promise<CandidateReferral> {
  const runner = client || pool;
  const sql = `
    UPDATE candidate_referrals
    SET status = $2,
        notes = COALESCE($3, notes),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const res = await runner.query(sql, [id, status, notes || null]);
  return res.rows[0];
}

/**
 * Insert a status transition audit history record.
 */
export async function insertStatusHistory(
  referralId: number,
  oldStatus: string | null,
  newStatus: string,
  changedById: number | null,
  note?: string,
  client?: PoolClient,
): Promise<ReferralStatusHistory> {
  const runner = client || pool;
  const sql = `
    INSERT INTO candidate_referral_status_history (
      referral_id,
      old_status,
      new_status,
      changed_by_id,
      note
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const res = await runner.query(sql, [
    referralId,
    oldStatus,
    newStatus,
    changedById,
    note || null,
  ]);
  return res.rows[0];
}

/**
 * Get status history timeline for a referral.
 */
export async function getReferralStatusHistory(referralId: number): Promise<ReferralStatusHistory[]> {
  const sql = `
    SELECT 
      crsh.*,
      au.name as changed_by_name
    FROM candidate_referral_status_history crsh
    LEFT JOIN admin_users au ON crsh.changed_by_id = au.id
    WHERE crsh.referral_id = $1
    ORDER BY crsh.created_at ASC
  `;
  const res = await pool.query(sql, [referralId]);
  return res.rows;
}

/**
 * Get aggregated referral metrics.
 */
export async function getReferralMetrics(): Promise<ReferralMetrics> {
  const sql = `
    SELECT 
      COUNT(*)::int AS total_referrals,
      COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
      COUNT(*) FILTER (WHERE status = 'interviewing')::int AS interviewing,
      COUNT(*) FILTER (WHERE status = 'offered')::int AS offered,
      COUNT(*) FILTER (WHERE status = 'hired')::int AS hired,
      COUNT(*) FILTER (WHERE status = 'declined')::int AS declined,
      (SELECT COUNT(*)::int FROM partner_companies WHERE is_active = true) AS total_companies
    FROM candidate_referrals
  `;
  const res = await pool.query(sql);
  return res.rows[0] || {
    total_referrals: 0,
    under_review: 0,
    interviewing: 0,
    offered: 0,
    hired: 0,
    declined: 0,
    total_companies: 0,
  };
}
