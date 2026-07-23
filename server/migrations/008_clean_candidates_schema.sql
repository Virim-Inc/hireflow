-- HireFlow - Migration 008: Clean candidates schema by dropping legacy scoring columns
-- The candidates table will now store profile details only. 
-- All match evaluations and scores will live exclusively in the candidate_job_matches table.

ALTER TABLE candidates
  DROP COLUMN IF EXISTS jd_title,
  DROP COLUMN IF EXISTS jd_company,
  DROP COLUMN IF EXISTS total_score,
  DROP COLUMN IF EXISTS frontend_score,
  DROP COLUMN IF EXISTS backend_score,
  DROP COLUMN IF EXISTS database_score,
  DROP COLUMN IF EXISTS ai_ml_score,
  DROP COLUMN IF EXISTS exp_score,
  DROP COLUMN IF EXISTS soft_score,
  DROP COLUMN IF EXISTS grade,
  DROP COLUMN IF EXISTS recommendation,
  DROP COLUMN IF EXISTS is_qualified,
  DROP COLUMN IF EXISTS summary,
  DROP COLUMN IF EXISTS strengths,
  DROP COLUMN IF EXISTS weaknesses,
  DROP COLUMN IF EXISTS frontend_feedback,
  DROP COLUMN IF EXISTS backend_feedback,
  DROP COLUMN IF EXISTS database_feedback,
  DROP COLUMN IF EXISTS ai_ml_feedback,
  DROP COLUMN IF EXISTS hiring_note;

-- Clean existing test records for a pristine implementation
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
TRUNCATE TABLE candidates RESTART IDENTITY CASCADE;
TRUNCATE TABLE candidate_job_matches RESTART IDENTITY CASCADE;
