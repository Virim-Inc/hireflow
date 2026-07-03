// ── API types matching the PostgreSQL candidates table ──────────────────────

export interface Candidate {
  id: number;
  submitted_at: string;
  processed_at: string;
  source: string;
  candidate_name: string;
  email: string;
  phone: string;
  position: string;
  years_of_exp: number;
  linkedin: string;
  current_job_title: string;
  highest_degree: string;
  certifications: string;

  // Skills
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

  // JD
  jd_title: string;
  jd_company: string;

  // Scores
  total_score: number;
  frontend_score: number;
  backend_score: number;
  database_score: number;
  ai_ml_score: number;
  exp_score: number;
  soft_score: number;
  grade: string;
  recommendation: string;
  is_qualified: boolean;

  // Feedback
  summary: string;
  strengths: string;
  weaknesses: string;
  frontend_feedback: string;
  backend_feedback: string;
  database_feedback: string;
  ai_ml_feedback: string;
  hiring_note: string;

  // WorkDrive metadata
  workdrive_file_id: string;
  workdrive_file_name: string;
  source_folder_id: string;
  processed_folder_id: string;
}

export interface CandidatesResponse {
  data: Candidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CandidateStats {
  total: string;
  qualified: string;
  not_qualified: string;
  avg_score: string;
  avg_frontend: string;
  avg_backend: string;
  avg_database: string;
  strong_hire: string;
  hire: string;
  consider: string;
  reject: string;
  from_form: string;
  from_email: string;
}

export interface CandidateFilters {
  search: string;
  grade: string;
  recommendation: string;
  qualified: string;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}
