-- Migration: 020_add_candidate_test_link.sql
-- Adds scheduled_test_link to candidates table for Zoho / meeting integration

ALTER TABLE candidates 
  ADD COLUMN IF NOT EXISTS scheduled_test_link TEXT;
