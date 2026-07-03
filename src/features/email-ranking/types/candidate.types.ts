export type CandidateStatus = 'replied' | 'pending' | 'review' | 'shortlisted' | 'rejected';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Grade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
export type Recommendation = 'Strong Hire' | 'Hire' | 'Maybe' | 'No Hire' | 'Strong No Hire';

export interface SkillMatch {
  skill: string;
  matched: boolean;
  weight: number; // 0–1
}

/** Full candidate record matching the workflow output schema */
export interface Candidate {
  id: string;
  rank: number;

  // ── Identity ──
  candidateName: string;
  email: string;
  phone?: string;
  linkedin?: string;
  currentJobTitle: string;

  // ── Application context ──
  submittedAt: string;   // ISO date
  source: string;        // e.g. "Email", "LinkedIn", "Referral"
  position: string;      // applied position
  jdTitle: string;
  jdCompany: string;

  // ── Experience ──
  yearsOfExp: number;
  highestDegree: string;
  certifications: string[];

  // ── Skills ──
  frontendSkills: string[];
  frontendLevel: SkillLevel;
  backendSkills: string[];
  backendLevel: SkillLevel;
  databaseSkills: string[];
  databaseLevel: SkillLevel;
  aiMlSkills: string[];
  aiMlLevel: SkillLevel;
  cloudDevOps: string[];
  programmingLangs: string[];
  notableProjects: string[];

  // ── Scores ──
  totalScore: number;         // 0–100
  frontendScore: number;
  backendScore: number;
  databaseScore: number;
  aiMlScore: number;
  expScore: number;
  softScore: number;
  localTotalScore?: number;
  remoteTotalScore?: number;

  // ── AI Assessment ──
  grade: Grade;
  recommendation: Recommendation;
  isQualified: boolean;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  frontendFeedback: string;
  backendFeedback: string;
  databaseFeedback: string;
  aiMlFeedback: string;
  hiringNote: string;

  // ── Processing meta ──
  localModelAvailable: boolean;
  remoteModelAvailable: boolean;
  aiFallbackUsed: boolean;
  processedAt: string; // ISO date

  // ── UI state ──
  status: CandidateStatus;

  // ── Legacy / computed ──
  skills: SkillMatch[];       // union of all skill categories for tag display
  avatar?: string;            // initials fallback
}

export interface CandidateFilters {
  status: CandidateStatus | 'all';
  minScore: number;
  sortBy: 'rank' | 'score' | 'date' | 'name';
  sortOrder: 'asc' | 'desc';
  search: string;
}

export interface EmailStats {
  total: number;
  ranked: number;
  replied: number;
  pending: number;
  shortlisted: number;
}
