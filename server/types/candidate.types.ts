// ─────────────────────────────────────────────────────────────────────────────
// Shared server-side types
// These are the single source of truth for all layers (repo, service, route).
// ─────────────────────────────────────────────────────────────────────────────

export const PIPELINE_STAGES = [
  'screening',
  'shortlisted',
  'ai_interview',
  'in_person_interview',
  'hired',
  'rejected',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export function isPipelineStage(value: string | undefined): value is PipelineStage {
  return Boolean(value && PIPELINE_STAGES.includes(value as PipelineStage));
}

// ── Database row types ────────────────────────────────────────────────────────

export interface CandidateRow {
  id: number;
  submitted_at: string;
  processed_at: string;
  source: string;
  candidate_name: string;
  email: string;
  phone: string;
  position: string;
  position_label: string;
  years_of_exp: number;
  linkedin: string;
  current_job_title: string;
  highest_degree: string;
  certifications: string;
  frontend_skills: string;
  frontend_level: string;
  backend_skills: string;
  backend_level: string;
  database_skills: string;
  database_level: string;
  ai_ml_skills: string;
  ai_ml_level: string;
  cloud_devops: string;
  programming_langs: string;
  notable_projects: string;
  best_score: number | null;
  best_recommendation: string | null;
  best_grade: string | null;
  workdrive_file_id: string;
  workdrive_file_name: string;
  source_folder_id: string;
  processed_folder_id: string;
  pipeline_stage: PipelineStage;
  pipeline_stage_updated_at: string;
  latest_stage_note: string | null;
  city: string | null;
  internship_completed: boolean | null;
  passout_year: number | null;
  college: string | null;
  degree: string | null;

  // Test Scheduling fields
  scheduled_test_date?: string | null;
  scheduled_test_time?: string | null;
  scheduled_test_at?: string | null;
  scheduled_test_duration?: number | null;
  scheduled_test_notes?: string | null;
  scheduled_test_sent_at?: string | null;
  
  // Dynamic matched job description scores
  jd_matches?: Record<string, {
    overall_score: number;
    technical_score: number;
    experience_score: number;
    education_score: number;
    communication_score: number;
    project_score: number;
    recommendation: string;
    grade: string;
    matched_skills: any;
    missing_skills: any;
    strengths: string[];
    weaknesses: string[];
    summary: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
    scored_at: string | null;
  }> | null;
}

export interface JobDescriptionRow {
  id: number;
  title: string;
  department: string | null;
  employment_type: string | null;
  work_mode: string | null;
  location: string | null;
  openings: number;
  experience_min: number;
  experience_max: number;
  education: string | null;
  specialization: string | null;
  required_skills: any; // JSONB
  preferred_skills: any; // JSONB
  responsibilities: string | null;
  requirements: string | null;
  nice_to_have: string | null;
  ai_prompt: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CandidateJobMatchRow {
  candidate_id: number;
  jd_id: number;
  overall_score: number;
  technical_score: number;
  experience_score: number;
  education_score: number;
  communication_score: number;
  project_score: number;
  recommendation: string;
  grade: string;
  matched_skills: any;
  missing_skills: any;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  scored_at: string | null;
  created_at: string;
}

export interface CandidateHistoryRow {
  id: number;
  candidate_id: number;
  from_stage: PipelineStage | null;
  to_stage: PipelineStage;
  note: string | null;
  changed_at: string;
}

export interface StatsSummaryRow {
  total: string;
  qualified: string;
  qualified_today: string;
  qualified_this_month: string;
  avg_score: string | null;
  top_score: string | null;
  top_score_today: string | null;
  top_score_this_month: string | null;
  open_pipeline: string;
  open_today: string;
  open_this_month: string;
  active_today: string;
  moved_today: string;
  active_this_month: string;
  moved_this_month: string;
  active_this_week: string;
  moved_this_week: string;
  candidates_today: string;
  candidates_yesterday: string;
  candidates_last_7_days: string;
  candidates_last_30_days: string;
  from_workdrive: string;
  from_email: string;
  stage_screening: string;
  stage_shortlisted: string;
  stage_ai_interview: string;
  stage_in_person_interview: string;
  stage_hired: string;
  stage_rejected: string;
  strong_hire: string;
  hire: string;
  consider: string;
  reject: string;
}

export interface PositionCountRow {
  position_label: string;
  count: string;
}

export interface CandidateSkillRow {
  frontend_skills: string | null;
  backend_skills: string | null;
  database_skills: string | null;
  ai_ml_skills: string | null;
  cloud_devops: string | null;
  programming_langs: string | null;
}

// ── Request / query types ─────────────────────────────────────────────────────

export interface CandidatesQuery {
  search?: string;
  skill?: string;
  grade?: string;
  recommendation?: string;
  qualified?: string;
  stage?: string;
  source?: string;
  position?: string;
  city?: string;
  internship_completed?: string;
  passout_year?: string;
  college?: string;
  degree?: string;
  date_from?: string;
  date_to?: string;
  min_score?: string;
  sort?: string;
  order?: string;
  page?: string;
  limit?: string;
  jd_id?: string; // support single or multiple JDs (e.g. "1,2")
}

export interface UpdateStageBody {
  stage?: string;
  note?: string;
}

export type EmptyParams = Record<string, never>;
