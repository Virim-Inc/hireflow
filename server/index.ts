import express, { Request, Response } from 'express';
import { Pool, PoolClient, PoolConfig } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.API_PORT ?? 3001;

const PIPELINE_STAGES = [
  'screening',
  'shortlisted',
  'ai_interview',
  'in_person_interview',
  'hired',
  'rejected',
] as const;

type PipelineStage = typeof PIPELINE_STAGES[number];

interface CandidateRow {
  id: number;
  submitted_at: string;
  processed_at: string;
  source: string;
  candidate_name: string;
  email: string;
  phone: string;
  position: string;
  position_label: string;
  years_of_exp: number;
  linkedin: string;
  current_job_title: string;
  highest_degree: string;
  certifications: string;
  frontend_skills: string;
  frontend_level: string;
  backend_skills: string;
  backend_level: string;
  database_skills: string;
  database_level: string;
  ai_ml_skills: string;
  ai_ml_level: string;
  cloud_devops: string;
  programming_langs: string;
  notable_projects: string;
  jd_title: string;
  jd_company: string;
  total_score: number;
  frontend_score: number;
  backend_score: number;
  database_score: number;
  ai_ml_score: number;
  exp_score: number;
  soft_score: number;
  grade: string;
  recommendation: string;
  is_qualified: boolean;
  summary: string;
  strengths: string;
  weaknesses: string;
  frontend_feedback: string;
  backend_feedback: string;
  database_feedback: string;
  ai_ml_feedback: string;
  hiring_note: string;
  workdrive_file_id: string;
  workdrive_file_name: string;
  source_folder_id: string;
  processed_folder_id: string;
  pipeline_stage: PipelineStage;
  pipeline_stage_updated_at: string;
  latest_stage_note: string | null;
}

interface CandidateHistoryRow {
  id: number;
  candidate_id: number;
  from_stage: PipelineStage | null;
  to_stage: PipelineStage;
  note: string | null;
  changed_at: string;
}

interface StatsSummaryRow {
  total: string;
  qualified: string;
  avg_score: string | null;
  top_score: string | null;
  active_this_week: string;
  moved_this_week: string;
  from_form: string;
  from_email: string;
  stage_screening: string;
  stage_shortlisted: string;
  stage_ai_interview: string;
  stage_in_person_interview: string;
  stage_hired: string;
  stage_rejected: string;
  strong_hire: string;
  hire: string;
  consider: string;
  reject: string;
}

interface PositionCountRow {
  position_label: string;
  count: string;
}

interface CandidatesQuery {
  search?: string;
  grade?: string;
  recommendation?: string;
  qualified?: string;
  stage?: string;
  source?: string;
  position?: string;
  date_from?: string;
  date_to?: string;
  min_score?: string;
  sort?: string;
  order?: string;
  page?: string;
  limit?: string;
}

interface UpdateStageBody {
  stage?: string;
  note?: string;
}

type EmptyParams = Record<string, never>;

const PG_CONFIG: PoolConfig = {
  host: process.env.PG_HOST ?? 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE ?? 'hireflow',
  user: process.env.PG_USER ?? 'hireflow',
  password: process.env.PG_PASSWORD ?? 'swq344hW888b',
  ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
};

const pool = new Pool(PG_CONFIG);

pool.on('error', (err: Error) => {
  console.error('[DB] Pool error:', err.message);
});

const POSITION_EXPR = "COALESCE(NULLIF(TRIM(position), ''), NULLIF(TRIM(jd_title), ''), 'Unassigned role')";
const SELECT_COLUMNS = `
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
  pipeline_stage, pipeline_stage_updated_at, latest_stage_note
`;

const SORT_COLUMNS: Record<string, string> = {
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

function parseInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function parseNumeric(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asNumber(value: string | null | undefined): number {
  return Number.parseFloat(value ?? '0') || 0;
}

function isPipelineStage(value: string | undefined): value is PipelineStage {
  return Boolean(value && PIPELINE_STAGES.includes(value as PipelineStage));
}

function buildWhereClause(query: CandidatesQuery): { whereClause: string; params: Array<string | number> } {
  const params: Array<string | number> = [];
  const where: string[] = [];
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

  if (query.recommendation) {
    where.push(`recommendation ILIKE $${idx}`);
    params.push(`%${query.recommendation}%`);
    idx++;
  }

  if (query.qualified === 'true') {
    where.push('is_qualified = true');
  } else if (query.qualified === 'false') {
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

  const minScore = parseNumeric(query.min_score);
  if (minScore !== null) {
    where.push(`total_score >= $${idx}`);
    params.push(minScore);
    idx++;
  }

  if (query.date_from) {
    where.push(`DATE(COALESCE(submitted_at, processed_at)) >= $${idx}`);
    params.push(query.date_from);
    idx++;
  }

  if (query.date_to) {
    where.push(`DATE(COALESCE(submitted_at, processed_at)) <= $${idx}`);
    params.push(query.date_to);
  }

  return {
    whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

async function testConnection(): Promise<void> {
  console.log('\nTrying to connect to PostgreSQL with:');
  console.log(`  host:     ${PG_CONFIG.host}`);
  console.log(`  port:     ${PG_CONFIG.port}`);
  console.log(`  database: ${PG_CONFIG.database}`);
  console.log(`  user:     ${PG_CONFIG.user}`);
  console.log(`  password: ${PG_CONFIG.password ? '***set***' : '(empty)'}`);
  console.log(`  ssl:      ${PG_CONFIG.ssl !== false}`);

  try {
    const client = await pool.connect();
    const res = await client.query<{
      current_database: string;
      current_user: string;
      version: string;
    }>('SELECT current_database(), current_user, version()');
    const row = res.rows[0];
    console.log('\nPostgreSQL connected.');
    console.log(`  database: ${row.current_database}`);
    console.log(`  user:     ${row.current_user}`);
    console.log(`  version:  ${row.version.split(' ').slice(0, 2).join(' ')}\n`);
    client.release();
  } catch (err) {
    const error = err as NodeJS.ErrnoException & { code?: string; detail?: string };
    console.error('\nPostgreSQL connection failed:');
    console.error(`  Error:  ${error.message}`);
    console.error(`  Code:   ${error.code}`);
    console.error(`  Detail: ${error.detail ?? 'none'}`);
    console.error('\nUpdate .env.local with the correct PG_HOST, PG_DATABASE, PG_USER, and PG_PASSWORD.\n');
  }
}

async function ensurePipelineSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS pipeline_stage TEXT,
      ADD COLUMN IF NOT EXISTS pipeline_stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS latest_stage_note TEXT
  `);

  await pool.query(`
    UPDATE candidates
    SET pipeline_stage = CASE
      WHEN LOWER(COALESCE(recommendation, '')) LIKE '%strong hire%' THEN 'shortlisted'
      WHEN LOWER(COALESCE(recommendation, '')) LIKE '%reject%' THEN 'rejected'
      ELSE 'screening'
    END
    WHERE pipeline_stage IS NULL OR TRIM(pipeline_stage) = ''
  `);

  await pool.query(`
    ALTER TABLE candidates
      DROP CONSTRAINT IF EXISTS candidates_pipeline_stage_check
  `);

  await pool.query(`
    ALTER TABLE candidates
      ADD CONSTRAINT candidates_pipeline_stage_check
      CHECK (pipeline_stage IN (
        'screening',
        'shortlisted',
        'ai_interview',
        'in_person_interview',
        'hired',
        'rejected'
      ))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_stage_history (
      id BIGSERIAL PRIMARY KEY,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      from_stage TEXT,
      to_stage TEXT NOT NULL CHECK (to_stage IN (
        'screening',
        'shortlisted',
        'ai_interview',
        'in_person_interview',
        'hired',
        'rejected'
      )),
      note TEXT,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, note, changed_at)
    SELECT
      c.id,
      NULL,
      c.pipeline_stage,
      'Imported existing candidate into pipeline tracking',
      COALESCE(c.processed_at, c.created_at, NOW())
    FROM candidates c
    WHERE NOT EXISTS (
      SELECT 1
      FROM candidate_stage_history h
      WHERE h.candidate_id = c.id
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_candidates_pipeline_stage
      ON candidates (pipeline_stage)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_candidates_position
      ON candidates (position)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_candidates_submitted_at
      ON candidates (submitted_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_candidate_stage_history_candidate_id
      ON candidate_stage_history (candidate_id, changed_at DESC)
  `);
}

async function getCandidateById(client: PoolClient | Pool, candidateId: string): Promise<CandidateRow | null> {
  const result = await client.query<CandidateRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM candidates
     WHERE id = $1`,
    [candidateId],
  );
  return result.rows[0] ?? null;
}

function parseCandidateId(rawId: string): number | null {
  const parsed = Number.parseInt(rawId, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    const error = err as Error;
    res.status(503).json({ status: 'error', db: 'disconnected', error: error.message });
  }
});

app.get('/api/candidates', async (req: Request<EmptyParams, unknown, unknown, CandidatesQuery>, res: Response): Promise<void> => {
  try {
    const pageNum = parseInteger(req.query.page, 1, 1, 99999);
    const limitNum = parseInteger(req.query.limit, 20, 1, 200);
    const offset = (pageNum - 1) * limitNum;
    const { whereClause, params } = buildWhereClause(req.query);

    const sortKey = req.query.sort ?? 'processed_at';
    const safeSort = SORT_COLUMNS[sortKey] ?? 'processed_at';
    const safeOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM candidates ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query<CandidateRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM candidates
       ${whereClause}
       ORDER BY ${safeSort} ${safeOrder}, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset],
    );

    res.json({
      data: dataRes.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    const error = err as Error;
    console.error('[GET /api/candidates]', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/candidates/meta', async (_req: Request, res: Response): Promise<void> => {
  try {
    const positionsRes = await pool.query<PositionCountRow>(
      `SELECT ${POSITION_EXPR} AS position_label, COUNT(*)::text AS count
       FROM candidates
       GROUP BY 1
       ORDER BY COUNT(*) DESC, 1 ASC`,
    );

    res.json({
      positions: positionsRes.rows.map((row) => row.position_label),
      stages: PIPELINE_STAGES,
      sources: ['form', 'email'],
    });
  } catch (err) {
    const error = err as Error;
    console.error('[GET /api/candidates/meta]', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/candidates/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const candidateId = parseCandidateId(req.params.id);
    if (candidateId === null) {
      res.status(400).json({ error: 'Invalid candidate id' });
      return;
    }

    const candidate = await getCandidateById(pool, String(candidateId));
    if (!candidate) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(candidate);
  } catch (err) {
    const error = err as Error;
    console.error('[GET /api/candidates/:id]', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/candidates/:id/history', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const candidateId = parseCandidateId(req.params.id);
    if (candidateId === null) {
      res.status(400).json({ error: 'Invalid candidate id' });
      return;
    }

    const result = await pool.query<CandidateHistoryRow>(
      `SELECT id, candidate_id, from_stage, to_stage, note, changed_at
       FROM candidate_stage_history
       WHERE candidate_id = $1
       ORDER BY changed_at DESC
       LIMIT 25`,
      [candidateId],
    );
    res.json(result.rows);
  } catch (err) {
    const error = err as Error;
    console.error('[GET /api/candidates/:id/history]', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.patch(
  '/api/candidates/:id/stage',
  async (req: Request<{ id: string }, unknown, UpdateStageBody>, res: Response): Promise<void> => {
    const { stage, note } = req.body;
    const candidateId = parseCandidateId(req.params.id);

    if (candidateId === null) {
      res.status(400).json({ error: 'Invalid candidate id' });
      return;
    }

    if (!isPipelineStage(stage)) {
      res.status(400).json({ error: 'Invalid stage value' });
      return;
    }

    const trimmedNote = note?.trim() ? note.trim() : null;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const current = await client.query<{ pipeline_stage: PipelineStage }>(
        'SELECT pipeline_stage FROM candidates WHERE id = $1 FOR UPDATE',
        [candidateId],
      );

      if (!current.rows.length) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Candidate not found' });
        return;
      }

      const previousStage = current.rows[0].pipeline_stage;
      if (previousStage === stage && !trimmedNote) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Candidate is already in that stage' });
        return;
      }

      await client.query(
        `UPDATE candidates
         SET pipeline_stage = $2,
             pipeline_stage_updated_at = NOW(),
             latest_stage_note = $3
         WHERE id = $1`,
        [candidateId, stage, trimmedNote],
      );

      await client.query(
        `INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, note)
         VALUES ($1, $2, $3, $4)`,
        [candidateId, previousStage, stage, trimmedNote],
      );

      await client.query('COMMIT');
      const candidate = await getCandidateById(client, String(candidateId));
      res.json(candidate);
    } catch (err) {
      await client.query('ROLLBACK');
      const error = err as Error;
      console.error('[PATCH /api/candidates/:id/stage]', error.message);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  },
);

app.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [summaryRes, positionsRes] = await Promise.all([
      pool.query<StatsSummaryRow>(`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE is_qualified = true)::text AS qualified,
          ROUND(AVG(total_score)::numeric, 1)::text AS avg_score,
          COALESCE(MAX(total_score), 0)::text AS top_score,
          COUNT(*) FILTER (WHERE COALESCE(submitted_at, processed_at, NOW()) >= NOW() - INTERVAL '7 days')::text AS active_this_week,
          COUNT(*) FILTER (WHERE COALESCE(pipeline_stage_updated_at, processed_at, NOW()) >= NOW() - INTERVAL '7 days')::text AS moved_this_week,
          COUNT(*) FILTER (WHERE LOWER(source) = 'form')::text AS from_form,
          COUNT(*) FILTER (WHERE LOWER(source) = 'email')::text AS from_email,
          COUNT(*) FILTER (WHERE pipeline_stage = 'screening')::text AS stage_screening,
          COUNT(*) FILTER (WHERE pipeline_stage = 'shortlisted')::text AS stage_shortlisted,
          COUNT(*) FILTER (WHERE pipeline_stage = 'ai_interview')::text AS stage_ai_interview,
          COUNT(*) FILTER (WHERE pipeline_stage = 'in_person_interview')::text AS stage_in_person_interview,
          COUNT(*) FILTER (WHERE pipeline_stage = 'hired')::text AS stage_hired,
          COUNT(*) FILTER (WHERE pipeline_stage = 'rejected')::text AS stage_rejected,
          COUNT(*) FILTER (WHERE recommendation = 'Strong Hire')::text AS strong_hire,
          COUNT(*) FILTER (WHERE recommendation = 'Hire')::text AS hire,
          COUNT(*) FILTER (WHERE recommendation = 'Consider')::text AS consider,
          COUNT(*) FILTER (WHERE recommendation = 'Reject')::text AS reject
        FROM candidates
      `),
      pool.query<PositionCountRow>(`
        SELECT ${POSITION_EXPR} AS position_label, COUNT(*)::text AS count
        FROM candidates
        GROUP BY 1
        ORDER BY COUNT(*) DESC, 1 ASC
        LIMIT 8
      `),
    ]);

    const summary = summaryRes.rows[0];
    res.json({
      totalCandidates: asNumber(summary.total),
      qualifiedCandidates: asNumber(summary.qualified),
      averageScore: asNumber(summary.avg_score),
      topScore: asNumber(summary.top_score),
      activeThisWeek: asNumber(summary.active_this_week),
      movedThisWeek: asNumber(summary.moved_this_week),
      sourceBreakdown: {
        form: asNumber(summary.from_form),
        email: asNumber(summary.from_email),
      },
      recommendationBreakdown: {
        strongHire: asNumber(summary.strong_hire),
        hire: asNumber(summary.hire),
        consider: asNumber(summary.consider),
        reject: asNumber(summary.reject),
      },
      stageCounts: {
        screening: asNumber(summary.stage_screening),
        shortlisted: asNumber(summary.stage_shortlisted),
        ai_interview: asNumber(summary.stage_ai_interview),
        in_person_interview: asNumber(summary.stage_in_person_interview),
        hired: asNumber(summary.stage_hired),
        rejected: asNumber(summary.stage_rejected),
      },
      topPositions: positionsRes.rows.map((row) => ({
        position: row.position_label,
        count: asNumber(row.count),
      })),
    });
  } catch (err) {
    const error = err as Error;
    console.error('[GET /api/stats]', error.message);
    res.status(500).json({ error: error.message });
  }
});

async function startServer(): Promise<void> {
  await testConnection();
  await ensurePipelineSchema();

  app.listen(PORT, () => {
    console.log(`\nHiring API running on http://localhost:${PORT}`);
    console.log(`  Health:     GET http://localhost:${PORT}/api/health`);
    console.log(`  Candidates: GET http://localhost:${PORT}/api/candidates`);
    console.log(`  Meta:       GET http://localhost:${PORT}/api/candidates/meta`);
    console.log(`  Stats:      GET http://localhost:${PORT}/api/stats`);
  });
}

startServer().catch((err: unknown) => {
  const error = err as Error;
  console.error('\nFailed to start Hiring API:', error.message);
  process.exit(1);
});
