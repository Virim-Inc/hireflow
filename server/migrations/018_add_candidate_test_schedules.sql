-- Migration: 018_add_candidate_test_schedules.sql
-- Adds test scheduling metadata to candidates table

ALTER TABLE candidates 
  ADD COLUMN IF NOT EXISTS scheduled_test_date VARCHAR(100),
  ADD COLUMN IF NOT EXISTS scheduled_test_time VARCHAR(100),
  ADD COLUMN IF NOT EXISTS scheduled_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_test_duration INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS scheduled_test_notes TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_test_sent_at TIMESTAMPTZ;
