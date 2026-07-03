-- HireFlow - Migration 003: add pipeline tracking and stage history

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'screening',
  ADD COLUMN IF NOT EXISTS pipeline_stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS latest_stage_note TEXT;

UPDATE candidates
SET pipeline_stage = CASE
  WHEN LOWER(COALESCE(recommendation, '')) LIKE '%strong hire%' THEN 'shortlisted'
  WHEN LOWER(COALESCE(recommendation, '')) LIKE '%hire%' THEN 'screening'
  WHEN LOWER(COALESCE(recommendation, '')) LIKE '%consider%' THEN 'screening'
  WHEN LOWER(COALESCE(recommendation, '')) LIKE '%reject%' THEN 'rejected'
  ELSE COALESCE(NULLIF(pipeline_stage, ''), 'screening')
END
WHERE pipeline_stage IS NULL
   OR pipeline_stage = '';

ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_pipeline_stage_check;

ALTER TABLE candidates
  ADD CONSTRAINT candidates_pipeline_stage_check
  CHECK (pipeline_stage IN (
    'screening',
    'shortlisted',
    'ai_interview',
    'in_person_interview',
    'hired',
    'rejected'
  ));

CREATE TABLE IF NOT EXISTS candidate_stage_history (
  id            BIGSERIAL PRIMARY KEY,
  candidate_id  INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  from_stage    TEXT,
  to_stage      TEXT NOT NULL CHECK (to_stage IN (
                  'screening',
                  'shortlisted',
                  'ai_interview',
                  'in_person_interview',
                  'hired',
                  'rejected'
                )),
  note          TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, note, changed_at)
SELECT c.id, NULL, c.pipeline_stage, 'Imported existing candidate into pipeline tracking', COALESCE(c.processed_at, c.created_at, NOW())
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1
  FROM candidate_stage_history h
  WHERE h.candidate_id = c.id
);

CREATE INDEX IF NOT EXISTS idx_candidates_pipeline_stage
  ON candidates (pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_candidates_position
  ON candidates (position);

CREATE INDEX IF NOT EXISTS idx_candidates_submitted_at
  ON candidates (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidate_stage_history_candidate_id
  ON candidate_stage_history (candidate_id, changed_at DESC);
