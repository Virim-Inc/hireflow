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
  city?: string | null;
  internship_completed?: boolean | null;
  passout_year?: number | null;
  college?: string | null;
  degree?: string | null;

  // Test Scheduling
  scheduled_test_date?: string | null;
  scheduled_test_time?: string | null;
  scheduled_test_at?: string | null;
  scheduled_test_duration?: number | null;
  scheduled_test_notes?: string | null;
  scheduled_test_sent_at?: string | null;

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

export interface JobDescription {
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
  required_skills: any;
  preferred_skills: any;
  responsibilities: string | null;
  requirements: string | null;
  nice_to_have: string | null;
  ai_prompt: string | null;
  is_active: boolean;
  matched_count?: number;
  created_at: string;
  updated_at: string;
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

export interface DailyAcquisitionPoint {
  date: string;
  received: number;
  shortlisted: number;
}

export interface DailyRecruitmentStats {
  received: number;
  shortlisted: number;
  rejected: number;
  pendingReview: number;
  interviewsScheduled: number;
  interviewsCompleted: number;
}

export interface CandidateStats {
  totalCandidates: number;
  qualifiedCandidates: number;
  qualifiedToday: number;
  qualifiedThisMonth: number;
  averageScore: number;
  topScore: number;
  topScoreToday: number;
  topScoreThisMonth: number;
  openPipeline: number;
  openToday: number;
  openThisMonth: number;
  activeToday: number;
  movedToday: number;
  activeThisMonth: number;
  movedThisMonth: number;
  activeThisWeek: number;
  movedThisWeek: number;
  candidatesToday: number;
  candidatesYesterday: number;
  candidatesLast7Days: number;
  candidatesLast30Days: number;
  dailyAcquisition: DailyAcquisitionPoint[];
  dailyRecruitmentStats?: {
    today: DailyRecruitmentStats;
    yesterday: DailyRecruitmentStats;
    last7Days: DailyRecruitmentStats;
    last30Days: DailyRecruitmentStats;
  };
  sourceBreakdown: {
    workdrive: number;
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
  skills: string[];
  cities: string[];
  colleges: string[];
  degrees: string[];
  passoutYears: number[];
}

export interface CandidateFilters {
  search: string;
  skill: string;
  grade: string;
  recommendation: string;
  qualified: string;
  stage: PipelineStage | '';
  source: string;
  position: string;
  city: string;
  internship_completed: string;
  passout_year: string;
  college: string;
  degree: string;
  date_from: string;
  date_to: string;
  min_score: string;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
  jd_id: string;
}

export interface UpdateCandidateStageInput {
  stage: PipelineStage;
  note?: string;
}
