import { pool } from '../config/db.js';
import { isPipelineStage } from '../types/candidate.types.js';
// ── SQL constants ─────────────────────────────────────────────────────────────
export const POSITION_EXPR = "COALESCE(NULLIF(TRIM(position), ''), NULLIF(TRIM(jd_title), ''), 'Unassigned role')";
export const SELECT_COLUMNS = `
  id, submitted_at, processed_at, source,
  candidate_name, email, phone, position,
  ${POSITION_EXPR} AS position_label,
  years_of_exp, linkedin, current_job_title, highest_degree, certifications,
  frontend_skills, frontend_level,
  backend_skills, backend_level,
  database_skills, database_level,
  ai_ml_skills, ai_ml_level,
  cloud_devops, programming_langs, notable_projects,
  jd_title, jd_company,
  total_score, frontend_score, backend_score,
  database_score, ai_ml_score, exp_score, soft_score,
  grade, recommendation, is_qualified,
  summary, strengths, weaknesses,
  frontend_feedback, backend_feedback, database_feedback,
  ai_ml_feedback, hiring_note,
  workdrive_file_id, workdrive_file_name,
  source_folder_id, processed_folder_id,
  pipeline_stage, pipeline_stage_updated_at, latest_stage_note,
  city, internship_completed, passout_year, college, degree
`;
export const SORT_COLUMNS = {
    processed_at: 'processed_at',
    submitted_at: 'submitted_at',
    total_score: 'total_score',
    candidate_name: 'candidate_name',
    grade: 'grade',
    recommendation: 'recommendation',
    position: 'position_label',
    years_of_exp: 'years_of_exp',
    pipeline_stage: 'pipeline_stage',
    pipeline_stage_updated_at: 'pipeline_stage_updated_at',
};
// ── WHERE clause builder ──────────────────────────────────────────────────────
export function buildWhereClause(query) {
    const params = [];
    const where = [];
    let idx = 1;
    if (query.search) {
        where.push(`(
      candidate_name ILIKE $${idx}
      OR email ILIKE $${idx}
      OR position ILIKE $${idx}
      OR jd_title ILIKE $${idx}
      OR frontend_skills ILIKE $${idx}
      OR backend_skills ILIKE $${idx}
      OR summary ILIKE $${idx}
    )`);
        params.push(`%${query.search}%`);
        idx++;
    }
    if (query.grade) {
        where.push(`grade = $${idx}`);
        params.push(query.grade);
        idx++;
    }
    const skillFilters = parseMultiValue(query.skill);
    if (skillFilters.length) {
        skillFilters.forEach((skill) => {
            where.push(`(
        frontend_skills ILIKE $${idx}
        OR backend_skills ILIKE $${idx}
        OR database_skills ILIKE $${idx}
        OR ai_ml_skills ILIKE $${idx}
        OR cloud_devops ILIKE $${idx}
        OR programming_langs ILIKE $${idx}
      )`);
            params.push(`%${skill}%`);
            idx++;
        });
    }
    if (query.recommendation) {
        where.push(`recommendation ILIKE $${idx}`);
        params.push(`%${query.recommendation}%`);
        idx++;
    }
    if (query.qualified === 'true') {
        where.push('is_qualified = true');
    }
    else if (query.qualified === 'false') {
        where.push('is_qualified = false');
    }
    if (isPipelineStage(query.stage)) {
        where.push(`pipeline_stage = $${idx}`);
        params.push(query.stage);
        idx++;
    }
    if (query.source) {
        where.push(`LOWER(source) = LOWER($${idx})`);
        params.push(query.source);
        idx++;
    }
    if (query.position) {
        where.push(`${POSITION_EXPR} = $${idx}`);
        params.push(query.position);
        idx++;
    }
    if (query.city) {
        where.push(`city = $${idx}`);
        params.push(query.city);
        idx++;
    }
    if (query.internship_completed === 'true') {
        where.push('internship_completed = true');
    }
    else if (query.internship_completed === 'false') {
        where.push('internship_completed = false');
    }
    if (query.passout_year) {
        const year = parseInt(query.passout_year, 10);
        if (!isNaN(year)) {
            where.push(`passout_year = $${idx}`);
            params.push(year);
            idx++;
        }
    }
    if (query.college) {
        where.push(`college = $${idx}`);
        params.push(query.college);
        idx++;
    }
    if (query.degree) {
        where.push(`degree = $${idx}`);
        params.push(query.degree);
        idx++;
    }
    const minScore = parseFloat(query.min_score);
    if (minScore !== null) {
        where.push(`total_score >= $${idx}`);
        params.push(minScore);
        idx++;
    }
    const dateField = isPipelineStage(query.stage)
        ? 'pipeline_stage_updated_at'
        : 'COALESCE(submitted_at, processed_at)';
    if (query.date_from) {
        where.push(`DATE(${dateField}) >= $${idx}`);
        params.push(query.date_from);
        idx++;
    }
    if (query.date_to) {
        where.push(`DATE(${dateField}) <= $${idx}`);
        params.push(query.date_to);
    }
    return {
        whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '',
        params,
    };
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function parseMultiValue(value) {
    return (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function parseFloat(value) {
    if (!value)
        return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}
export function collectUniqueSkills(rows) {
    const unique = new Map();
    rows.forEach((row) => {
        [
            row.frontend_skills,
            row.backend_skills,
            row.database_skills,
            row.ai_ml_skills,
            row.cloud_devops,
            row.programming_langs,
        ]
            .flatMap((value) => parseMultiValue(value ?? undefined))
            .forEach((skill) => {
            const normalized = skill.trim().toLowerCase();
            if (!normalized || normalized === 'n/a' || normalized === 'none')
                return;
            if (!unique.has(normalized))
                unique.set(normalized, skill.trim());
        });
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
}
// ── Repository functions ──────────────────────────────────────────────────────
export async function findCandidates(query, pageNum, limitNum, sortCol, sortOrder) {
    const { whereClause, params } = buildWhereClause(query);
    const offset = (pageNum - 1) * limitNum;
    const [countRes, dataRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM candidates ${whereClause}`, params),
        pool.query(`SELECT ${SELECT_COLUMNS}
       FROM candidates
       ${whereClause}
       ORDER BY ${sortCol} ${sortOrder}, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limitNum, offset]),
    ]);
    return {
        rows: dataRes.rows,
        total: Number.parseInt(countRes.rows[0].count, 10),
    };
}
export async function findCandidateById(db, id) {
    const result = await db.query(`SELECT ${SELECT_COLUMNS} FROM candidates WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
}
export async function findCandidateMeta() {
    const [positionsRes, skillsRes, citiesRes, collegesRes, degreesRes, passoutYearsRes] = await Promise.all([
        pool.query(`SELECT ${POSITION_EXPR} AS position_label, COUNT(*)::text AS count
       FROM candidates
       GROUP BY 1
       ORDER BY COUNT(*) DESC, 1 ASC`),
        pool.query(`SELECT frontend_skills, backend_skills, database_skills,
              ai_ml_skills, cloud_devops, programming_langs
       FROM candidates`),
        pool.query(`SELECT DISTINCT TRIM(city) AS city
       FROM candidates
       WHERE city IS NOT NULL AND TRIM(city) <> ''
       ORDER BY city`),
        pool.query(`SELECT DISTINCT TRIM(college) AS college
       FROM candidates
       WHERE college IS NOT NULL AND TRIM(college) <> ''
       ORDER BY college`),
        pool.query(`SELECT DISTINCT TRIM(degree) AS degree
       FROM candidates
       WHERE degree IS NOT NULL AND TRIM(degree) <> ''
       ORDER BY degree`),
        pool.query(`SELECT DISTINCT passout_year
       FROM candidates
       WHERE passout_year IS NOT NULL
       ORDER BY passout_year DESC`),
    ]);
    return {
        positions: positionsRes.rows.map((r) => r.position_label),
        skills: collectUniqueSkills(skillsRes.rows),
        cities: citiesRes.rows.map((r) => r.city).filter(Boolean),
        colleges: collegesRes.rows.map((r) => r.college).filter(Boolean),
        degrees: degreesRes.rows.map((r) => r.degree).filter(Boolean),
        passoutYears: passoutYearsRes.rows.map((r) => r.passout_year).filter((y) => y !== null),
    };
}
export async function findCandidateHistory(id) {
    const result = await pool.query(`SELECT id, candidate_id, from_stage, to_stage, note, changed_at
     FROM candidate_stage_history
     WHERE candidate_id = $1
     ORDER BY changed_at DESC
     LIMIT 25`, [id]);
    return result.rows;
}
export async function lockCandidateStage(client, id) {
    const result = await client.query('SELECT pipeline_stage FROM candidates WHERE id = $1 FOR UPDATE', [id]);
    return result.rows[0]?.pipeline_stage ?? null;
}
export async function updateCandidateStage(client, id, stage, note) {
    await client.query(`UPDATE candidates
     SET pipeline_stage = $2,
         pipeline_stage_updated_at = NOW(),
         latest_stage_note = $3
     WHERE id = $1`, [id, stage, note]);
}
export async function insertStageHistory(client, candidateId, fromStage, toStage, note) {
    await client.query(`INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, note)
     VALUES ($1, $2, $3, $4)`, [candidateId, fromStage, toStage, note]);
}
//# sourceMappingURL=candidate.repo.js.map