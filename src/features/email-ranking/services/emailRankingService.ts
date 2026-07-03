import type { Candidate, EmailStats, CandidateFilters, SkillMatch } from '../types/candidate.types';

const BASE = '/api';

// ── DB row shape returned by the server ──────────────────────────────────────
interface CandidateRow {
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
}

interface StatsRow {
  total: string;
  qualified: string;
  not_qualified: string;
  avg_score: string;
  strong_hire: string;
  hire: string;
  consider: string;
  reject: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a JSON array field that may be stored as a string or real array */
function parseArr(val: string | string[] | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

/** Derive a short UI status from the recommendation string */
function recToStatus(rec: string): Candidate['status'] {
  const r = rec.toLowerCase();
  if (r.includes('strong hire')) return 'shortlisted';
  if (r.includes('hire'))        return 'replied';
  if (r.includes('maybe') || r.includes('consider')) return 'review';
  return 'pending';
}

/** Build the legacy SkillMatch[] union from all skill categories */
function buildSkills(row: CandidateRow): SkillMatch[] {
  const fe  = parseArr(row.frontend_skills);
  const be  = parseArr(row.backend_skills);
  const db  = parseArr(row.database_skills);
  const ai  = parseArr(row.ai_ml_skills);
  const all = [...fe, ...be, ...db, ...ai];
  return all.slice(0, 8).map(s => ({ skill: s, matched: true, weight: 0.8 }));
}

/** Map a DB row → Candidate (camelCase) */
function mapRow(row: CandidateRow, rank: number): Candidate {
  const name    = row.candidate_name ?? '';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return {
    id:                String(row.id),
    rank,
    candidateName:     name,
    email:             row.email ?? '',
    phone:             row.phone ?? undefined,
    linkedin:          row.linkedin ?? undefined,
    currentJobTitle:   row.current_job_title ?? '',
    submittedAt:       row.submitted_at ?? '',
    source:            row.source ?? '',
    position:          row.position ?? '',
    jdTitle:           row.jd_title ?? '',
    jdCompany:         row.jd_company ?? '',
    yearsOfExp:        row.years_of_exp ?? 0,
    highestDegree:     row.highest_degree ?? '',
    certifications:    parseArr(row.certifications),
    frontendSkills:    parseArr(row.frontend_skills),
    frontendLevel:     (row.frontend_level ?? 'beginner') as Candidate['frontendLevel'],
    backendSkills:     parseArr(row.backend_skills),
    backendLevel:      (row.backend_level  ?? 'beginner') as Candidate['backendLevel'],
    databaseSkills:    parseArr(row.database_skills),
    databaseLevel:     (row.database_level ?? 'beginner') as Candidate['databaseLevel'],
    aiMlSkills:        parseArr(row.ai_ml_skills),
    aiMlLevel:         (row.ai_ml_level    ?? 'beginner') as Candidate['aiMlLevel'],
    cloudDevOps:       parseArr(row.cloud_devops),
    programmingLangs:  parseArr(row.programming_langs),
    notableProjects:   parseArr(row.notable_projects),
    totalScore:        row.total_score    ?? 0,
    frontendScore:     row.frontend_score ?? 0,
    backendScore:      row.backend_score  ?? 0,
    databaseScore:     row.database_score ?? 0,
    aiMlScore:         row.ai_ml_score    ?? 0,
    expScore:          row.exp_score      ?? 0,
    softScore:         row.soft_score     ?? 0,
    grade:             (row.grade ?? 'F') as Candidate['grade'],
    recommendation:    (row.recommendation ?? 'No Hire') as Candidate['recommendation'],
    isQualified:       row.is_qualified   ?? false,
    summary:           row.summary        ?? '',
    strengths:         parseArr(row.strengths),
    weaknesses:        parseArr(row.weaknesses),
    frontendFeedback:  row.frontend_feedback  ?? '',
    backendFeedback:   row.backend_feedback   ?? '',
    databaseFeedback:  row.database_feedback  ?? '',
    aiMlFeedback:      row.ai_ml_feedback     ?? '',
    hiringNote:        row.hiring_note        ?? '',
    localModelAvailable:  true,
    remoteModelAvailable: true,
    aiFallbackUsed:       false,
    processedAt:       row.processed_at ?? '',
    status:            recToStatus(row.recommendation ?? ''),
    skills:            buildSkills(row),
    avatar:            initials,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const emailRankingService = {
  async getCandidates(filters?: Partial<CandidateFilters>): Promise<Candidate[]> {
    const params = new URLSearchParams();
    if (filters?.search)   params.set('search', filters.search);
    if (filters?.minScore) params.set('min_score', String(filters.minScore));
    if (filters?.sortBy === 'score')  params.set('sort', 'total_score');
    if (filters?.sortBy === 'date')   params.set('sort', 'processed_at');
    if (filters?.sortBy === 'name')   params.set('sort', 'candidate_name');
    if (filters?.sortOrder) params.set('order', filters.sortOrder);
    params.set('limit', '100');

    const qs  = params.toString();
    const res = await fetch(`${BASE}/candidates${qs ? `?${qs}` : ''}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error: string }).error || `HTTP ${res.status}`);
    }
    const json = await res.json() as { data: CandidateRow[] };
    return json.data.map((row, i) => mapRow(row, i + 1));
  },

  async getStats(): Promise<EmailStats> {
    const res = await fetch(`${BASE}/stats`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error: string }).error || `HTTP ${res.status}`);
    }
    const row = await res.json() as StatsRow;
    return {
      total:       parseInt(row.total, 10)       || 0,
      ranked:      parseInt(row.total, 10)       || 0,
      replied:     parseInt(row.hire, 10)        || 0,
      pending:     parseInt(row.consider, 10)    || 0,
      shortlisted: parseInt(row.strong_hire, 10) || 0,
    };
  },

  async sendReply(candidateId: string): Promise<{ success: boolean; message: string }> {
    // TODO: wire up to a real email/reply endpoint when available
    await new Promise(r => setTimeout(r, 800));
    return { success: true, message: `Reply sent to candidate ${candidateId}` };
  },

  async resendReply(candidateId: string): Promise<{ success: boolean; message: string }> {
    await new Promise(r => setTimeout(r, 800));
    return { success: true, message: `Reply re-sent to candidate ${candidateId}` };
  },
};
