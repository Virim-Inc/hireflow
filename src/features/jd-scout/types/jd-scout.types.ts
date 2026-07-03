export type ScoutStatus = 'idle' | 'searching' | 'complete' | 'error';

export interface JdFormData {
  title: string;
  company: string;
  location: string;
  locationType: 'onsite' | 'remote' | 'hybrid';
  experienceMin: number;
  experienceMax: number;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  description: string;
  education: string;
  industry: string;
}

export interface ScoutCandidate {
  id: string;
  rank: number;
  score: number; // 0–100
  name: string;
  title: string;
  currentCompany: string;
  location: string;
  experience: number; // years
  education: string;
  avatar?: string;
  skills: string[];
  matchedSkills: string[];
  matchBreakdown: {
    overall: number;
    skills: number;
    location: number;
    experience: number;
    cultureFit: number;
    education: number;
  };
  salaryExpectation: string;
  availability: string; // e.g. "2 weeks notice"
  linkedinUrl?: string;
  portfolioUrl?: string;
  status: 'available' | 'open' | 'not_looking';
}

export interface ScoutFilters {
  minScore: number;
  locations: string[];
  experienceMin: number;
  experienceMax: number;
  skills: string[];
  availability: string[];
  locationType: ('onsite' | 'remote' | 'hybrid')[];
}

export interface ScoutResults {
  candidates: ScoutCandidate[];
  totalFound: number;
  searchedAt: string;
  jdTitle: string;
}
