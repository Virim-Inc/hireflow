-- ═══════════════════════════════════════════════════════════════════════════
--  HireFlow — Migration 002: Add WorkDrive columns to candidates table
--  Run this in your VS Code PostgreSQL extension (Right-click → Run Query)
--  or paste into psql connected to your 'hireflow' / 'hiring' database.
-- ═══════════════════════════════════════════════════════════════════════════

-- Add WorkDrive metadata columns (all nullable — form/email candidates won't have these)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS workdrive_file_id    TEXT,
  ADD COLUMN IF NOT EXISTS workdrive_file_name  TEXT,
  ADD COLUMN IF NOT EXISTS source_folder_id     TEXT,
  ADD COLUMN IF NOT EXISTS processed_folder_id  TEXT;

-- Optional index for lookups by workdrive file id
CREATE INDEX IF NOT EXISTS idx_candidates_workdrive_file_id
  ON candidates (workdrive_file_id)
  WHERE workdrive_file_id IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'candidates'
  AND  column_name  IN (
         'workdrive_file_id',
         'workdrive_file_name',
         'source_folder_id',
         'processed_folder_id'
       )
ORDER  BY column_name;
