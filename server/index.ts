/**
 * Hiring Dashboard — Express API Server
 * Serves candidate data from PostgreSQL
 * Runs on port 3001 (proxied via Vite → /api/*)
 */

import express, { Request, Response } from 'express';
import { Pool, PoolConfig } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.API_PORT ?? 3001;

// ── Types ────────────────────────────────────────────────────────────────────

interface CandidateRow {
  id: number;
  submitted_at: string;
  processed_at: string;
  source: string;
  candidate_name: string;
  email: string;
  phone: string;
  position: string;
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
}

interface StatsRow {
  total: string;
  qualified: string;
  not_qualified: string;
  avg_score: string;
  avg_frontend: string;
  avg_backend: string;
  avg_database: string;
  strong_hire: string;
  hire: string;
  consider: string;
  reject: string;
  from_form: string;
  from_email: string;
}

interface CandidatesQuery {
  search?: string;
  grade?: string;
  recommendation?: string;
  qualified?: string;
  sort?: string;
  order?: string;
  page?: string;
  limit?: string;
}

// ── PostgreSQL pool ─────────────────────────────────────────────────────────

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

// ── Test connection on startup ────────────────────────────────────────────────

async function testConnection(): Promise<void> {
  console.log('\n🔌 Trying to connect to PostgreSQL with:');
  console.log(`   host:     ${PG_CONFIG.host}`);
  console.log(`   port:     ${PG_CONFIG.port}`);
  console.log(`   database: ${PG_CONFIG.database}`);
  console.log(`   user:     ${PG_CONFIG.user}`);
  console.log(`   password: ${PG_CONFIG.password ? '***set***' : '(empty)'}`);
  console.log(`   ssl:      ${PG_CONFIG.ssl !== false}`);

  try {
    const client = await pool.connect();
    const res = await client.query<{
      current_database: string;
      current_user: string;
      version: string;
    }>('SELECT current_database(), current_user, version()');
    const row = res.rows[0];
    console.log('\n✅ PostgreSQL connected!');
    console.log(`   database: ${row.current_database}`);
    console.log(`   user:     ${row.current_user}`);
    console.log(`   version:  ${row.version.split(' ').slice(0, 2).join(' ')}\n`);
    client.release();
  } catch (err) {
    const error = err as NodeJS.ErrnoException & { code?: string; detail?: string };
    console.error('\n❌ PostgreSQL connection FAILED:');
    console.error(`   Error:  ${error.message}`);
    console.error(`   Code:   ${error.code}`);
    console.error(`   Detail: ${error.detail ?? 'none'}`);
    console.error('\n👉 Fix your .env.local — update PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD');
    console.error('   Check what credentials you used in the VS Code PostgreSQL extension.\n');
  }
}

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    const error = err as Error;
    res.status(503).json({ status: 'error', db: 'disconnected', error: error.message });
  }
});

// ── GET /api/candidates ──────────────────────────────────────────────────────
// Query params:
//   search         – filter by name / email / position (ILIKE)
//   grade          – filter by grade (A+, A, B+, B, C, D, F)
//   recommendation – filter (Strong Hire | Hire | Consider | Reject)
//   qualified      – 'true' | 'false'
//   sort           – field to sort by (default: processed_at)
//   order          – 'asc' | 'desc' (default: desc)
//   page           – page number (default: 1)
//   limit          – rows per page (default: 20, max: 100)

app.get('/api/candidates', async (req: Request<{}, {}, {}, CandidatesQuery>, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      grade = '',
      recommendation = '',
      qualified = '',
      sort = 'processed_at',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    // Whitelist sort columns to prevent SQL injection
    const ALLOWED_SORT = new Set<string>([
      'processed_at', 'submitted_at', 'total_score', 'candidate_name',
      'grade', 'recommendation', 'position', 'years_of_exp',
    ]);
    const safeSort = ALLOWED_SORT.has(sort) ? sort : 'processed_at';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const params: (string | number)[] = [];
    const where: string[] = [];
    let idx = 1;

    if (search) {
      where.push(`(
        candidate_name ILIKE $${idx}
        OR email        ILIKE $${idx}
        OR position     ILIKE $${idx}
        OR frontend_skills ILIKE $${idx}
        OR backend_skills  ILIKE $${idx}
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    if (grade) {
      where.push(`grade = $${idx}`);
      params.push(grade);
      idx++;
    }

    if (recommendation) {
      where.push(`recommendation ILIKE $${idx}`);
      params.push(`%${recommendation}%`);
      idx++;
    }

    if (qualified === 'true') {
      where.push('is_qualified = true');
    } else if (qualified === 'false') {
      where.push('is_qualified = false');
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Total count
    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM candidates ${whereClause}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Data rows
    const dataRes = await pool.query<CandidateRow>(
      `SELECT
         id, submitted_at, processed_at, source,
         candidate_name, email, phone, position, years_of_exp,
         linkedin, current_job_title, highest_degree, certifications,
         frontend_skills, frontend_level,
         backend_skills,  backend_level,
         database_skills, database_level,
         ai_ml_skills,    ai_ml_level,
         cloud_devops,    programming_langs, notable_projects,
         jd_title, jd_company,
         total_score, frontend_score, backend_score,
         database_score, ai_ml_score, exp_score, soft_score,
         grade, recommendation, is_qualified,
         summary, strengths, weaknesses,
         frontend_feedback, backend_feedback, database_feedback,
         ai_ml_feedback, hiring_note,
         workdrive_file_id, workdrive_file_name,
         source_folder_id, processed_folder_id
       FROM candidates
       ${whereClause}
       ORDER BY ${safeSort} ${safeOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
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

// ── GET /api/candidates/:id ──────────────────────────────────────────────────

app.get('/api/candidates/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<CandidateRow>('SELECT * FROM candidates WHERE id = $1', [id]);
    if (!result.rows.length) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    console.error('[GET /api/candidates/:id]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/stats ────────────────────────────────────────────────────────────

app.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<StatsRow>(`
      SELECT
        COUNT(*)                                            AS total,
        COUNT(*) FILTER (WHERE is_qualified = true)        AS qualified,
        COUNT(*) FILTER (WHERE is_qualified = false)       AS not_qualified,
        ROUND(AVG(total_score)::numeric, 1)                AS avg_score,
        ROUND(AVG(frontend_score)::numeric, 1)             AS avg_frontend,
        ROUND(AVG(backend_score)::numeric, 1)              AS avg_backend,
        ROUND(AVG(database_score)::numeric, 1)             AS avg_database,
        COUNT(*) FILTER (WHERE recommendation = 'Strong Hire') AS strong_hire,
        COUNT(*) FILTER (WHERE recommendation = 'Hire')        AS hire,
        COUNT(*) FILTER (WHERE recommendation = 'Consider')    AS consider,
        COUNT(*) FILTER (WHERE recommendation = 'Reject')      AS reject,
        COUNT(*) FILTER (WHERE source = 'form')            AS from_form,
        COUNT(*) FILTER (WHERE source = 'email')           AS from_email
      FROM candidates
    `);
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    console.error('[GET /api/stats]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Hiring API running on http://localhost:${PORT}`);
  console.log(`   Health:     GET http://localhost:${PORT}/api/health`);
  console.log(`   Candidates: GET http://localhost:${PORT}/api/candidates`);
  console.log(`   Stats:      GET http://localhost:${PORT}/api/stats`);
  testConnection();
});
