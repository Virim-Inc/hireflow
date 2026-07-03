export const PIPELINE_STAGES = [
  'screening',
  'shortlisted',
  'ai_interview',
  'in_person_interview',
  'hired',
  'rejected',
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export interface Candidate {
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
  jd_title: string;
  jd_company: string;
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
  summary: string;
  strengths: string;
  weaknesses: string;
  frontend_feedback: string;
  backend_feedback: string;
  database_feedback: string;
  ai_ml_feedback: string;
  hiring_note: string;
  workdrive_file_id: string;
  workdrive_file_name: string;
  source_folder_id: string;
  processed_folder_id: string;
  pipeline_stage: PipelineStage;
  pipeline_stage_updated_at: string;
  latest_stage_note: string | null;
}

export interface CandidatesResponse {
  data: Candidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CandidateStageHistoryItem {
  id: number;
  candidate_id: number;
  from_stage: PipelineStage | null;
  to_stage: PipelineStage;
  note: string | null;
  changed_at: string;
}

export interface CandidateStats {
  totalCandidates: number;
  qualifiedCandidates: number;
  averageScore: number;
  topScore: number;
  activeThisWeek: number;
  movedThisWeek: number;
  sourceBreakdown: {
    form: number;
    email: number;
  };
  recommendationBreakdown: {
    strongHire: number;
    hire: number;
    consider: number;
    reject: number;
  };
  stageCounts: Record<PipelineStage, number>;
  topPositions: Array<{
    position: string;
    count: number;
  }>;
}

export interface CandidateMeta {
  positions: string[];
  stages: PipelineStage[];
  sources: string[];
}

export interface CandidateFilters {
  search: string;
  grade: string;
  recommendation: string;
  qualified: string;
  stage: PipelineStage | '';
  source: string;
  position: string;
  date_from: string;
  date_to: string;
  min_score: string;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface UpdateCandidateStageInput {
  stage: PipelineStage;
  note?: string;
}
