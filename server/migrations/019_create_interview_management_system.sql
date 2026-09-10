-- HireFlow - Migration 019: Create Interview Management System
-- Tables for interviews, multi-interviewer participants, availability requests, alternative slots, audit events, in-app notifications, and feedback scorecards.

-- 1. Master Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_description_id INTEGER REFERENCES job_descriptions(id) ON DELETE SET NULL,
  
  -- Round & Mode Definitions
  round_name VARCHAR(100) NOT NULL, -- e.g. 'Technical Round 1', 'System Design', 'Managerial Round', 'HR Round'
  interview_type VARCHAR(50) NOT NULL DEFAULT 'technical', -- 'screening', 'technical', 'managerial', 'culture_fit', 'hr'
  interview_mode VARCHAR(50) NOT NULL DEFAULT 'video', -- 'in_person', 'video', 'phone'
  
  -- Location & Meeting Info
  location_details TEXT, -- e.g. 'Indore Office · 4th Floor · Meeting Room 2'
  meeting_provider VARCHAR(50) DEFAULT 'zoho_meeting', -- 'zoho_meeting', 'google_meet', 'teams', 'in_person', 'phone'
  meeting_link TEXT,
  
  -- Timezone-Aware Schedule Timestamps (TIMESTAMPTZ)
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',

  -- Master Lifecycle State Machine
  status VARCHAR(50) NOT NULL DEFAULT 'awaiting_interviewer',
  -- 'draft', 'awaiting_interviewer', 'interviewer_reschedule_requested', 'requires_reassignment', 
  -- 'scheduled', 'reschedule_requested', 'in_progress', 'completed', 
  -- 'candidate_no_show', 'interviewer_no_show', 'cancelled'

  notes TEXT, -- Internal notes from HR
  cancellation_reason TEXT,
  candidate_notified_at TIMESTAMPTZ, -- Timestamp when official invitation email was dispatched
  
  created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Interview Participants (Multi-Interviewer Support with is_required Flag)
CREATE TABLE IF NOT EXISTS interview_participants (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL, -- Nullable for external guest interviewers
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'interviewer', -- 'lead_interviewer', 'interviewer', 'observer'
  is_required BOOLEAN NOT NULL DEFAULT TRUE, -- If TRUE, interview CANNOT become 'scheduled' without this participant's confirmation
  
  response_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'declined', 'availability_provided', 'removed'
  decline_reason VARCHAR(100), -- 'unavailable', 'wrong_interviewer', 'conflict_of_interest', 'other'
  decline_notes TEXT,
  responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_interview_participant UNIQUE (interview_id, email)
);

-- 3. Interviewer Availability Requests & SHA-256 Token Hashes
CREATE TABLE IF NOT EXISTS interview_availability_requests (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES interview_participants(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'reschedule_proposed', 'declined', 'expired', 'consumed', 'revoked'
  
  token_hash VARCHAR(128) NOT NULL UNIQUE, -- SHA-256 hash of the secure 64-char random token
  requested_start_at TIMESTAMPTZ NOT NULL,
  requested_end_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, -- Defaults to 72 hours from dispatch
  responded_at TIMESTAMPTZ,
  response_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Interviewer Proposed Alternative Slots (Suggestions for HR Review)
CREATE TABLE IF NOT EXISTS interview_availability_slots (
  id SERIAL PRIMARY KEY,
  availability_request_id INTEGER NOT NULL REFERENCES interview_availability_requests(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'proposed', -- 'proposed', 'selected_by_hr', 'rejected', 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Immutable Interview Audit Events
CREATE TABLE IF NOT EXISTS interview_events (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, 
  -- 'created', 'interviewer_assigned', 'availability_request_sent', 'interviewer_confirmed', 
  -- 'interviewer_declined', 'alternative_slots_proposed', 'hr_selected_alternative', 
  -- 'scheduled', 'candidate_notified', 'rescheduled', 'in_progress', 'completed', 
  -- 'candidate_no_show', 'interviewer_no_show', 'feedback_submitted', 'cancelled'
  actor_type VARCHAR(50) NOT NULL DEFAULT 'recruiter', -- 'system', 'recruiter', 'interviewer', 'admin'
  actor_user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_name VARCHAR(150),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Role-Aware In-App Notifications
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  interview_id INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'interview_assigned', 'action_required', 'alternative_proposed', 'interviewer_declined', 'feedback_needed', 'interview_cancelled'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_link VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Structured Interview Evaluation Scorecard
CREATE TABLE IF NOT EXISTS interview_feedback (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES interview_participants(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  
  overall_rating NUMERIC(3,1) NOT NULL CHECK (overall_rating >= 1.0 AND overall_rating <= 10.0),
  recommendation VARCHAR(50) NOT NULL, -- 'strong_hire', 'hire', 'neutral', 'no_hire', 'strong_no_hire'
  technical_rating NUMERIC(3,1) CHECK (technical_rating >= 1.0 AND technical_rating <= 10.0),
  problem_solving_rating NUMERIC(3,1) CHECK (problem_solving_rating >= 1.0 AND problem_solving_rating <= 10.0),
  communication_rating NUMERIC(3,1) CHECK (communication_rating >= 1.0 AND communication_rating <= 10.0),
  culture_fit_rating NUMERIC(3,1) CHECK (culture_fit_rating >= 1.0 AND culture_fit_rating <= 10.0),
  
  strengths TEXT,
  weaknesses TEXT,
  general_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_participant_feedback UNIQUE (interview_id, participant_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_start_at ON interviews(scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON interview_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON interview_participants(response_status);
CREATE INDEX IF NOT EXISTS idx_avail_requests_token ON interview_availability_requests(token_hash);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON in_app_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_interview_events_interview ON interview_events(interview_id, created_at DESC);
