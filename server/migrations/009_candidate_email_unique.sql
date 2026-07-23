-- HireFlow - Migration 009: Add UNIQUE constraint to candidate email
-- Required for ON CONFLICT (email) upsert operation in n8n.

ALTER TABLE candidates 
  ADD CONSTRAINT candidates_email_unique UNIQUE (email);
