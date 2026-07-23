-- =============================================================================
-- HireFlow Enterprise AI Recruitment Pipeline - PostgreSQL Migration
-- Description: Adds new candidate profile columns, 7-category scoring fields,
--              structured insights, deduplication indexes, and audit logging.
-- Backward Compatibility: All columns use IF NOT EXISTS with DEFAULT/NULL.
-- =============================================================================

-- 1. Candidate Profile Extensions
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS github TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS portfolio TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS project_count INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS project_complexity_score NUMERIC(4,1) DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS certification_count INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_quality_score NUMERIC(5,1) DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,1) DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS internship_company TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS internship_role TEXT; 
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS specialization TEXT;

-- 2. 7-Category Weighted Scoring Model Fields
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS technical_score NUMERIC(5,1) DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS project_score NUMERIC(5,1) DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS education_score NUMERIC(5,1) DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS certification_score NUMERIC(5,1) DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS achievement_score NUMERIC(5,1) DEFAULT 0;

-- 3. Evidence & Per-Field Confidence (JSON strings)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS score_evidence TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS field_confidence TEXT;

-- 4. Structured Recruiter Insights
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS recommended_role TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS key_technologies TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS recommendation_rationale TEXT;

-- 5. Content Fingerprinting & Performance Tracking
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_hash TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS processing_ms INTEGER;


-- 6. Performance & Deduplication Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_candidates_resume_hash ON candidates(resume_hash);
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates(phone);

-- 7. Dashboard Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_passout_year ON candidates(passout_year);
CREATE INDEX IF NOT EXISTS idx_candidates_city ON candidates(city);
CREATE INDEX IF NOT EXISTS idx_candidates_degree ON candidates(degree);
CREATE INDEX IF NOT EXISTS idx_candidates_college ON candidates(college);
CREATE INDEX IF NOT EXISTS idx_candidates_internship ON candidates(internship_completed);
CREATE INDEX IF NOT EXISTS idx_candidates_submitted_at ON candidates(submitted_at);
CREATE INDEX IF NOT EXISTS idx_candidates_recommendation ON candidates(recommendation);

-- 8. Duplicate Submission Audit Table (Optional)
CREATE TABLE IF NOT EXISTS duplicate_log (
  id             SERIAL PRIMARY KEY,
  attempted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email          TEXT,
  candidate_name TEXT,
  source         TEXT,
  existing_id    INTEGER,
  action_taken   TEXT DEFAULT 'Blocked — duplicate email'
);
CREATE INDEX IF NOT EXISTS idx_duplicate_log_email ON duplicate_log(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_duplicate_log_date  ON duplicate_log(attempted_at);
