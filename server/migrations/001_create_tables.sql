-- ═══════════════════════════════════════════════════════════════════════════
--  HireFlow — PostgreSQL Table Setup
--  Run this file in the VS Code PostgreSQL extension:
--    1. Open this file
--    2. Right-click → "Run Query"  OR  press Ctrl+Shift+E
--    3. Make sure you are connected to your 'hiring' database first
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Create database (run this separately if database doesn't exist yet) ──
-- CREATE DATABASE hiring;


-- ── 2. users table — stores basic applicant info on submission ──────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL        PRIMARY KEY,
  candidate_name  TEXT,
  email           TEXT          UNIQUE,
  phone           TEXT,
  position        TEXT,
  source          TEXT,                        -- 'form' or 'email'
  linkedin        TEXT,
  years_of_exp    NUMERIC       DEFAULT 0,
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);


-- ── 3. candidates table — stores full AI-scored candidate details ────────────
CREATE TABLE IF NOT EXISTS candidates (
  id                  SERIAL        PRIMARY KEY,

  -- ── Submission info ──────────────────────────────────────────────────────
  submitted_at        TIMESTAMPTZ,
  processed_at        TIMESTAMPTZ   DEFAULT NOW(),
  source              TEXT,                    -- 'form' or 'email'

  -- ── Personal details ─────────────────────────────────────────────────────
  candidate_name      TEXT,
  email               TEXT,
  phone               TEXT,
  position            TEXT,
  years_of_exp        NUMERIC       DEFAULT 0,
  linkedin            TEXT,
  current_job_title   TEXT,
  highest_degree      TEXT,
  certifications      TEXT,

  -- ── Skills extracted by AI ───────────────────────────────────────────────
  frontend_skills     TEXT,
  frontend_level      TEXT,
  backend_skills      TEXT,
  backend_level       TEXT,
  database_skills     TEXT,
  database_level      TEXT,
  ai_ml_skills        TEXT,
  ai_ml_level         TEXT,
  cloud_devops        TEXT,
  programming_langs   TEXT,
  notable_projects    TEXT,

  -- ── Job description context ───────────────────────────────────────────────
  jd_title            TEXT,
  jd_company          TEXT,

  -- ── AI Scores (/100 total) ────────────────────────────────────────────────
  total_score         NUMERIC       DEFAULT 0,
  frontend_score      NUMERIC       DEFAULT 0,  -- max 25
  backend_score       NUMERIC       DEFAULT 0,  -- max 25
  database_score      NUMERIC       DEFAULT 0,  -- max 20
  ai_ml_score         NUMERIC       DEFAULT 0,  -- max 15
  exp_score           NUMERIC       DEFAULT 0,  -- max 10
  soft_score          NUMERIC       DEFAULT 0,  -- max 5

  -- ── AI Decision ───────────────────────────────────────────────────────────
  grade               TEXT,                    -- A+, A, B+, B, C, D, F
  recommendation      TEXT,                    -- Strong Hire, Hire, Consider, Reject
  is_qualified        BOOLEAN       DEFAULT FALSE,

  -- ── AI Feedback ───────────────────────────────────────────────────────────
  summary             TEXT,
  strengths           TEXT,
  weaknesses          TEXT,
  frontend_feedback   TEXT,
  backend_feedback    TEXT,
  database_feedback   TEXT,
  ai_ml_feedback      TEXT,
  hiring_note         TEXT,

  -- ── WorkDrive metadata (populated for workdrive-source candidates) ─────────
  workdrive_file_id   TEXT,
  workdrive_file_name TEXT,
  source_folder_id    TEXT,
  processed_folder_id TEXT,

  created_at          TIMESTAMPTZ   DEFAULT NOW()
);


-- ── 4. Useful indexes for fast filtering & sorting ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_candidates_total_score    ON candidates (total_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_grade          ON candidates (grade);
CREATE INDEX IF NOT EXISTS idx_candidates_recommendation ON candidates (recommendation);
CREATE INDEX IF NOT EXISTS idx_candidates_is_qualified   ON candidates (is_qualified);
CREATE INDEX IF NOT EXISTS idx_candidates_processed_at   ON candidates (processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_email          ON candidates (email);

CREATE INDEX IF NOT EXISTS idx_users_email               ON users (email);


-- ── 5. Verify tables were created ────────────────────────────────────────────
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name
   AND   table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('users', 'candidates')
ORDER BY table_name;
