-- =============================================================================
-- HireFlow Enterprise JD Redesign Migration
-- =============================================================================

-- 1. Create job_descriptions table
CREATE TABLE IF NOT EXISTS job_descriptions (
  id             SERIAL        PRIMARY KEY,
  title          TEXT          NOT NULL,
  department     TEXT,
  employment_type TEXT,        -- 'Full-time', 'Part-time', 'Contract', 'Internship'
  work_mode      TEXT,         -- 'Remote', 'Hybrid', 'Onsite'
  location       TEXT,
  openings       INTEGER       DEFAULT 1,
  experience_min INTEGER       DEFAULT 0,
  experience_max INTEGER       DEFAULT 0,
  education      TEXT,
  specialization TEXT,
  required_skills JSONB        NOT NULL DEFAULT '[]'::jsonb,
  preferred_skills JSONB       NOT NULL DEFAULT '[]'::jsonb,
  responsibilities TEXT,
  requirements   TEXT,
  nice_to_have   TEXT,
  ai_prompt      TEXT,         -- Custom evaluation instructions for the LLM
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- 2. Create candidate_job_matches table
CREATE TABLE IF NOT EXISTS candidate_job_matches (
  candidate_id        INTEGER       NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  jd_id              INTEGER       NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  
  -- Scores out of 100
  overall_score       NUMERIC       DEFAULT 0,
  technical_score     NUMERIC       DEFAULT 0,
  experience_score    NUMERIC       DEFAULT 0,
  education_score     NUMERIC       DEFAULT 0,
  communication_score NUMERIC       DEFAULT 0,
  project_score       NUMERIC       DEFAULT 0,
  
  recommendation      TEXT,         -- 'Strong Hire', 'Hire', 'Consider', 'Reject'
  grade               TEXT,         -- 'A+', 'A', 'B+', 'B', 'C', 'D', 'F'
  matched_skills      JSONB         NOT NULL DEFAULT '[]'::jsonb,
  missing_skills      JSONB         NOT NULL DEFAULT '[]'::jsonb,
  strengths           TEXT[],
  weaknesses          TEXT[],
  summary             TEXT,
  
  -- Workflow orchestration status
  status              TEXT          NOT NULL DEFAULT 'Pending'
                                    CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')),
  scored_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  CONSTRAINT candidate_job_matches_unique_match UNIQUE (candidate_id, jd_id)
);

-- Indexes for performance & lateral join lookups
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_jd ON candidate_job_matches(jd_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_score ON candidate_job_matches(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_active ON job_descriptions(is_active);
