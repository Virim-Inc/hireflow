export type SubmissionStatus = 'idle' | 'submitting' | 'processing' | 'success' | 'error';

export interface WorkflowFormData {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  yearsOfExperience: number;
  linkedin: string;
  resume: File | null;
}

export interface WorkflowResult {
  candidateName: string;
  email: string;
  phone: string;
  position: string;
  yearsOfExp: number;
  linkedin: string;
  source: string;
  submittedAt: string;
  processedAt: string;

  // Skills
  frontendSkills: string;
  frontendLevel: string;
  backendSkills: string;
  backendLevel: string;
  databaseSkills: string;
  databaseLevel: string;
  aiMlSkills: string;
  aiMlLevel: string;
  cloudDevOps: string;
  programmingLangs: string;
  notableProjects: string;
  certifications: string;
  currentJobTitle: string;
  highestDegree: string;

  // Scores
  totalScore: number;
  frontendScore: number;
  backendScore: number;
  databaseScore: number;
  aiMlScore: number;
  expScore: number;
  softScore: number;
  grade: string;
  recommendation: string;
  isQualified: boolean;

  // Feedback
  summary: string;
  strengths: string;
  weaknesses: string;
  frontendFeedback: string;
  backendFeedback: string;
  databaseFeedback: string;
  aiMlFeedback: string;
  hiringNote: string;
}
