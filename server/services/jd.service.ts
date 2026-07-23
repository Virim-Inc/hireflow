import * as jdRepo from '../repositories/jd.repo.js';
import type { JobDescriptionRow } from '../types/candidate.types.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function listJds(filters?: { active?: boolean; search?: string }): Promise<JobDescriptionRow[]> {
  return jdRepo.findAllJds(filters);
}

export async function getJdById(id: number): Promise<JobDescriptionRow> {
  const jd = await jdRepo.findJdById(id);
  if (!jd) {
    throw new HttpError(404, 'Job Description not found');
  }
  return jd;
}

export async function createJd(data: {
  title: string;
  department?: string;
  employment_type?: string;
  work_mode?: string;
  location?: string;
  openings?: number;
  experience_min?: number;
  experience_max?: number;
  education?: string;
  specialization?: string;
  required_skills?: any;
  preferred_skills?: any;
  responsibilities?: string;
  requirements?: string;
  nice_to_have?: string;
  ai_prompt?: string;
}): Promise<JobDescriptionRow> {
  if (!data.title?.trim()) {
    throw new HttpError(400, 'Job Title is required');
  }

  return jdRepo.createJd({
    title: data.title.trim(),
    department: data.department?.trim() || null,
    employment_type: data.employment_type?.trim() || null,
    work_mode: data.work_mode?.trim() || null,
    location: data.location?.trim() || null,
    openings: data.openings ?? 1,
    experience_min: data.experience_min ?? 0,
    experience_max: data.experience_max ?? 0,
    education: data.education?.trim() || null,
    specialization: data.specialization?.trim() || null,
    required_skills: data.required_skills || [],
    preferred_skills: data.preferred_skills || [],
    responsibilities: data.responsibilities?.trim() || null,
    requirements: data.requirements?.trim() || null,
    nice_to_have: data.nice_to_have?.trim() || null,
    ai_prompt: data.ai_prompt?.trim() || null,
  });
}

export async function updateJd(
  id: number,
  data: {
    title: string;
    department?: string;
    employment_type?: string;
    work_mode?: string;
    location?: string;
    openings?: number;
    experience_min?: number;
    experience_max?: number;
    education?: string;
    specialization?: string;
    required_skills?: any;
    preferred_skills?: any;
    responsibilities?: string;
    requirements?: string;
    nice_to_have?: string;
    ai_prompt?: string;
    is_active?: boolean;
  }
): Promise<JobDescriptionRow> {
  if (!data.title?.trim()) {
    throw new HttpError(400, 'Job Title is required');
  }

  const existing = await jdRepo.findJdById(id);
  if (!existing) {
    throw new HttpError(404, 'Job Description not found');
  }

  const updated = await jdRepo.updateJd(id, {
    title: data.title.trim(),
    department: data.department?.trim() || null,
    employment_type: data.employment_type?.trim() || null,
    work_mode: data.work_mode?.trim() || null,
    location: data.location?.trim() || null,
    openings: data.openings ?? 1,
    experience_min: data.experience_min ?? 0,
    experience_max: data.experience_max ?? 0,
    education: data.education?.trim() || null,
    specialization: data.specialization?.trim() || null,
    required_skills: data.required_skills || [],
    preferred_skills: data.preferred_skills || [],
    responsibilities: data.responsibilities?.trim() || null,
    requirements: data.requirements?.trim() || null,
    nice_to_have: data.nice_to_have?.trim() || null,
    ai_prompt: data.ai_prompt?.trim() || null,
    is_active: data.is_active,
  });

  if (!updated) {
    throw new HttpError(500, 'Failed to update Job Description');
  }

  return updated;
}

export async function deleteJd(id: number): Promise<void> {
  const deleted = await jdRepo.deleteJd(id);
  if (!deleted) {
    throw new HttpError(404, 'Job Description not found');
  }
}

export async function toggleJdActive(id: number, active: boolean): Promise<JobDescriptionRow> {
  const updated = await jdRepo.toggleJdActive(id, active);
  if (!updated) {
    throw new HttpError(404, 'Job Description not found');
  }
  return updated;
}
