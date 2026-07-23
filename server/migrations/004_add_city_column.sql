-- HireFlow - Migration 004: Add city column to candidates table
-- Extracted from the runtime ensurePipelineSchema() function so it runs
-- exactly once via the migration runner instead of on every server boot.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS idx_candidates_city
  ON candidates (city)
  WHERE city IS NOT NULL;
