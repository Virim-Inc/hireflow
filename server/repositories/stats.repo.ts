import { pool } from '../config/db.js';
import { POSITION_EXPR } from './candidate.repo.js';
import type { StatsSummaryRow, PositionCountRow } from '../types/candidate.types.js';

export async function fetchStatsSummary(): Promise<StatsSummaryRow> {
  const res = await pool.query<StatsSummaryRow>(`
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM candidate_job_matches WHERE candidate_id = candidates.id AND overall_score >= 50))::text AS qualified,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM candidate_job_matches WHERE candidate_id = candidates.id AND overall_score >= 50) AND DATE(COALESCE(submitted_at, processed_at, NOW())) = CURRENT_DATE)::text AS qualified_today,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM candidate_job_matches WHERE candidate_id = candidates.id AND overall_score >= 50) AND DATE_TRUNC('month', COALESCE(submitted_at, processed_at, NOW())) = DATE_TRUNC('month', CURRENT_DATE))::text AS qualified_this_month,
      COALESCE((SELECT ROUND(AVG(overall_score)::numeric, 1)::text FROM candidate_job_matches), '0.0') AS avg_score,
      COALESCE((SELECT MAX(overall_score)::text FROM candidate_job_matches), '0') AS top_score,
      COALESCE((SELECT MAX(m.overall_score)::text FROM candidate_job_matches m JOIN candidates c ON c.id = m.candidate_id WHERE DATE(COALESCE(c.submitted_at, c.processed_at, NOW())) = CURRENT_DATE), '0') AS top_score_today,
      COALESCE((SELECT MAX(m.overall_score)::text FROM candidate_job_matches m JOIN candidates c ON c.id = m.candidate_id WHERE DATE_TRUNC('month', COALESCE(c.submitted_at, c.processed_at, NOW())) = DATE_TRUNC('month', CURRENT_DATE)), '0') AS top_score_this_month,
      COUNT(*) FILTER (WHERE pipeline_stage NOT IN ('hired', 'rejected'))::text AS open_pipeline,
      COUNT(*) FILTER (WHERE pipeline_stage NOT IN ('hired', 'rejected') AND DATE(COALESCE(submitted_at, processed_at, NOW())) = CURRENT_DATE)::text AS open_today,
      COUNT(*) FILTER (WHERE pipeline_stage NOT IN ('hired', 'rejected') AND DATE_TRUNC('month', COALESCE(submitted_at, processed_at, NOW())) = DATE_TRUNC('month', CURRENT_DATE))::text AS open_this_month,
      COUNT(*) FILTER (WHERE DATE(COALESCE(submitted_at, processed_at, NOW())) = CURRENT_DATE)::text AS active_today,
      COUNT(*) FILTER (WHERE DATE(COALESCE(pipeline_stage_updated_at, processed_at, NOW())) = CURRENT_DATE)::text AS moved_today,
      COUNT(*) FILTER (WHERE DATE_TRUNC('month', COALESCE(submitted_at, processed_at, NOW())) = DATE_TRUNC('month', CURRENT_DATE))::text AS active_this_month,
      COUNT(*) FILTER (WHERE DATE_TRUNC('month', COALESCE(pipeline_stage_updated_at, processed_at, NOW())) = DATE_TRUNC('month', CURRENT_DATE))::text AS moved_this_month,
      COUNT(*) FILTER (WHERE COALESCE(submitted_at, processed_at, NOW()) >= NOW() - INTERVAL '7 days')::text AS active_this_week,
      COUNT(*) FILTER (WHERE COALESCE(pipeline_stage_updated_at, processed_at, NOW()) >= NOW() - INTERVAL '7 days')::text AS moved_this_week,
      COUNT(*) FILTER (WHERE DATE(COALESCE(submitted_at, processed_at, NOW())) = CURRENT_DATE)::text AS candidates_today,
      COUNT(*) FILTER (WHERE DATE(COALESCE(submitted_at, processed_at, NOW())) = CURRENT_DATE - INTERVAL '1 day')::text AS candidates_yesterday,
      COUNT(*) FILTER (WHERE COALESCE(submitted_at, processed_at, NOW()) >= CURRENT_DATE - INTERVAL '7 days')::text AS candidates_last_7_days,
      COUNT(*) FILTER (WHERE COALESCE(submitted_at, processed_at, NOW()) >= CURRENT_DATE - INTERVAL '30 days')::text AS candidates_last_30_days,
      COUNT(*) FILTER (WHERE LOWER(source) IN ('form', 'workdrive'))::text AS from_form,
      COUNT(*) FILTER (WHERE LOWER(source) = 'email')::text AS from_email,
      COUNT(*) FILTER (WHERE pipeline_stage = 'screening')::text AS stage_screening,
      COUNT(*) FILTER (WHERE pipeline_stage = 'shortlisted')::text AS stage_shortlisted,
      COUNT(*) FILTER (WHERE pipeline_stage = 'ai_interview')::text AS stage_ai_interview,
      COUNT(*) FILTER (WHERE pipeline_stage = 'in_person_interview')::text AS stage_in_person_interview,
      COUNT(*) FILTER (WHERE pipeline_stage = 'hired')::text AS stage_hired,
      COUNT(*) FILTER (WHERE pipeline_stage = 'rejected')::text AS stage_rejected,
      COUNT(*) FILTER (WHERE (SELECT recommendation FROM candidate_job_matches WHERE candidate_id = candidates.id ORDER BY overall_score DESC LIMIT 1) = 'Strong Hire')::text AS strong_hire,
      COUNT(*) FILTER (WHERE (SELECT recommendation FROM candidate_job_matches WHERE candidate_id = candidates.id ORDER BY overall_score DESC LIMIT 1) = 'Hire')::text AS hire,
      COUNT(*) FILTER (WHERE (SELECT recommendation FROM candidate_job_matches WHERE candidate_id = candidates.id ORDER BY overall_score DESC LIMIT 1) = 'Consider')::text AS consider,
      COUNT(*) FILTER (WHERE (SELECT recommendation FROM candidate_job_matches WHERE candidate_id = candidates.id ORDER BY overall_score DESC LIMIT 1) = 'Reject')::text AS reject
    FROM candidates
  `);
  return res.rows[0];
}

export async function fetchDailyAcquisition(limitDays = 30): Promise<Array<{ date: string; received: number; shortlisted: number }>> {
  const res = await pool.query<{ date: string; received: number; shortlisted: number }>(`
    SELECT
      TO_CHAR(COALESCE(submitted_at, processed_at, NOW()), 'YYYY-MM-DD') AS date,
      COUNT(*)::integer AS received,
      COUNT(*) FILTER (WHERE pipeline_stage = 'shortlisted')::integer AS shortlisted
    FROM candidates
    WHERE COALESCE(submitted_at, processed_at, NOW()) >= CURRENT_DATE - CAST($1 || ' days' AS INTERVAL)
    GROUP BY 1
    ORDER BY 1 ASC
  `, [limitDays]);
  return res.rows;
}

export async function fetchTopPositions(limit = 8): Promise<PositionCountRow[]> {
  const res = await pool.query<PositionCountRow>(
    `SELECT ${POSITION_EXPR} AS position_label, COUNT(*)::text AS count
     FROM candidates
     GROUP BY 1
     ORDER BY COUNT(*) DESC, 1 ASC
     LIMIT $1`,
    [limit],
  );
  return res.rows;
}

export async function fetchRecruitmentActivityGrouped(
  startDate: Date,
  endDate: Date
): Promise<{
  received: Array<{ date: string; count: number }>;
  transitions: Array<{ date: string; from_stage: string | null; to_stage: string; count: number }>;
}> {
  const [receivedRes, transitionsRes] = await Promise.all([
    pool.query<{ date: string; count: number }>(
      `SELECT
         TO_CHAR(COALESCE(submitted_at, processed_at, created_at, NOW()), 'YYYY-MM-DD') AS date,
         COUNT(*)::integer AS count
       FROM candidates
       WHERE COALESCE(submitted_at, processed_at, created_at, NOW()) >= $1
         AND COALESCE(submitted_at, processed_at, created_at, NOW()) < $2
       GROUP BY 1`,
      [startDate, endDate]
    ),
    pool.query<{ date: string; from_stage: string | null; to_stage: string; count: number }>(
      `SELECT
         TO_CHAR(changed_at, 'YYYY-MM-DD') AS date,
         from_stage,
         to_stage,
         COUNT(DISTINCT candidate_id)::integer AS count
       FROM candidate_stage_history
       WHERE changed_at >= $1 AND changed_at < $2
       GROUP BY 1, 2, 3`,
      [startDate, endDate]
    ),
  ]);

  return {
    received: receivedRes.rows,
    transitions: transitionsRes.rows,
  };
}
