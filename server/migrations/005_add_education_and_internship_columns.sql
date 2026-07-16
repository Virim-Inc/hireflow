-- HireFlow - Migration 005: Add education and internship columns to candidates table

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS internship_completed BOOLEAN,
  ADD COLUMN IF NOT EXISTS passout_year INTEGER,
  ADD COLUMN IF NOT EXISTS college TEXT,
  ADD COLUMN IF NOT EXISTS degree TEXT;

CREATE INDEX IF NOT EXISTS idx_candidates_internship_completed
  ON candidates (internship_completed)
  WHERE internship_completed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_passout_year
  ON candidates (passout_year)
  WHERE passout_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_college
  ON candidates (college)
  WHERE college IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_degree
  ON candidates (degree)
  WHERE degree IS NOT NULL;
