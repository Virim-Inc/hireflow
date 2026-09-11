-- Migration: 015_add_flowmingo_integration.sql
-- Description: Adds tables and columns for Flowmingo API and Webhook integration

-- 1. Add Flowmingo Interview Set ID to job_descriptions table
ALTER TABLE job_descriptions 
ADD COLUMN IF NOT EXISTS flowmingo_interview_set_id VARCHAR(100);

-- 2. Webhook Event Deduplication & Audit Log Table
CREATE TABLE IF NOT EXISTS flowmingo_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  schema_version VARCHAR(20) DEFAULT '1.0.0',
  organization_id INTEGER,
  payload JSONB NOT NULL,
  processing_status VARCHAR(30) NOT NULL DEFAULT 'received',
  error_message TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_flowmingo_webhook_event_id ON flowmingo_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_flowmingo_webhook_status ON flowmingo_webhook_events(processing_status);

-- 3. Flowmingo Candidate Invitations Table
CREATE TABLE IF NOT EXISTS flowmingo_invitations (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_description_id INTEGER REFERENCES job_descriptions(id) ON DELETE SET NULL,
  flowmingo_interview_set_id VARCHAR(100) NOT NULL,
  flowmingo_candidate_id VARCHAR(100),
  flowmingo_invitation_id VARCHAR(100) UNIQUE,
  flowmingo_submission_id VARCHAR(100) UNIQUE,
  invitation_status VARCHAR(50) DEFAULT 'pending',
  interview_status VARCHAR(50),
  invitation_message TEXT,
  submission_url TEXT,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flowmingo_inv_candidate ON flowmingo_invitations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_flowmingo_inv_set ON flowmingo_invitations(flowmingo_interview_set_id);
CREATE INDEX IF NOT EXISTS idx_flowmingo_inv_flow_cand ON flowmingo_invitations(flowmingo_candidate_id) WHERE flowmingo_candidate_id IS NOT NULL;

-- 4. Multi-Evaluation Results Table
CREATE TABLE IF NOT EXISTS flowmingo_evaluations (
  id SERIAL PRIMARY KEY,
  flowmingo_invitation_id INTEGER NOT NULL REFERENCES flowmingo_invitations(id) ON DELETE CASCADE,
  evaluation_type VARCHAR(20) NOT NULL,
  evaluation_score DECIMAL(4,2) NOT NULL CHECK (evaluation_score >= 0.00 AND evaluation_score <= 10.00),
  submission_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_invitation_evaluation_type UNIQUE(flowmingo_invitation_id, evaluation_type)
);

CREATE INDEX IF NOT EXISTS idx_flowmingo_eval_invitation ON flowmingo_evaluations(flowmingo_invitation_id);
