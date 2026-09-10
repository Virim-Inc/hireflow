// src/features/interviews/types/interview.types.ts

export type InterviewStatus =
  | 'draft'
  | 'awaiting_interviewer'
  | 'interviewer_reschedule_requested'
  | 'requires_reassignment'
  | 'scheduled'
  | 'reschedule_requested'
  | 'in_progress'
  | 'completed'
  | 'candidate_no_show'
  | 'interviewer_no_show'
  | 'cancelled';

export type InterviewMode = 'in_person' | 'video' | 'phone';
export type InterviewType = 'screening' | 'technical' | 'managerial' | 'culture_fit' | 'hr';
export type ParticipantRole = 'lead_interviewer' | 'interviewer' | 'observer';
export type ParticipantResponseStatus = 'pending' | 'confirmed' | 'declined' | 'availability_provided' | 'removed';
export type SlotStatus = 'proposed' | 'selected_by_hr' | 'rejected' | 'expired';

export interface InterviewParticipant {
  id: number;
  interview_id: number;
  user_id: number | null;
  name: string;
  email: string;
  role: ParticipantRole;
  is_required: boolean;
  response_status: ParticipantResponseStatus;
  decline_reason: string | null;
  decline_notes: string | null;
  responded_at: string | null;
}

export interface InterviewAvailabilitySlot {
  id: number;
  availability_request_id: number;
  start_at: string;
  end_at: string;
  status: SlotStatus;
}

export interface InterviewFeedback {
  id: number;
  interview_id: number;
  participant_id: number;
  user_id: number | null;
  overall_rating: number;
  recommendation: 'strong_hire' | 'hire' | 'neutral' | 'no_hire' | 'strong_no_hire';
  technical_rating: number | null;
  problem_solving_rating: number | null;
  communication_rating: number | null;
  culture_fit_rating: number | null;
  strengths: string | null;
  weaknesses: string | null;
  general_notes: string | null;
  submitted_at: string;
  interviewer_name?: string;
  interviewer_email?: string;
}

export interface InterviewEvent {
  id: number;
  interview_id: number;
  event_type: string;
  actor_type: string;
  actor_name: string | null;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Interview {
  id: number;
  candidate_id: number;
  job_description_id: number | null;
  round_name: string;
  interview_type: InterviewType;
  interview_mode: InterviewMode;
  location_details: string | null;
  meeting_provider: string | null;
  meeting_link: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  duration_minutes: number;
  timezone: string;
  status: InterviewStatus;
  notes: string | null;
  cancellation_reason: string | null;
  candidate_notified_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;

  candidate_name?: string;
  candidate_email?: string;
  position_label?: string;
  participants?: InterviewParticipant[];
  alternative_slots?: InterviewAvailabilitySlot[];
  feedback?: InterviewFeedback[];
  events?: InterviewEvent[];
}

export interface InAppNotification {
  id: number;
  user_id: number;
  interview_id: number | null;
  type: string;
  title: string;
  message: string;
  action_link: string | null;
  is_read: boolean;
  created_at: string;
}
