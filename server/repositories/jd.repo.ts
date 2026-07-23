import { pool } from '../config/db.js';
import type { JobDescriptionRow } from '../types/candidate.types.js';

export async function findAllJds(filters: { active?: boolean; search?: string } = {}): Promise<any[]> {
  const params: any[] = [];
  const where: string[] = [];
  let idx = 1;
  
  if (filters.active !== undefined) {
    where.push(`jd.is_active = $${idx}`);
    params.push(filters.active);
    idx++;
  }
  
  if (filters.search) {
    where.push(`(jd.title ILIKE $${idx} OR jd.department ILIKE $${idx} OR jd.location ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }
  
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT jd.id, jd.title, jd.department, jd.employment_type, jd.work_mode, jd.location, jd.openings, 
            jd.experience_min, jd.experience_max, jd.education, jd.specialization, 
            jd.required_skills, jd.preferred_skills, jd.responsibilities, jd.requirements, 
            jd.nice_to_have, jd.ai_prompt, jd.is_active, jd.created_at, jd.updated_at,
            COUNT(cjm.candidate_id)::int AS matched_count
     FROM job_descriptions jd
     LEFT JOIN candidate_job_matches cjm ON cjm.jd_id = jd.id
     ${whereClause}
     GROUP BY jd.id
     ORDER BY jd.created_at DESC`,
    params
  );
  return result.rows;
}

export async function findJdById(id: number): Promise<JobDescriptionRow | null> {
  const result = await pool.query<JobDescriptionRow>(
    `SELECT id, title, department, employment_type, work_mode, location, openings, 
            experience_min, experience_max, education, specialization, 
            required_skills, preferred_skills, responsibilities, requirements, 
            nice_to_have, ai_prompt, is_active, created_at, updated_at
     FROM job_descriptions
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createJd(jd: {
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
}): Promise<JobDescriptionRow> {
  const result = await pool.query<JobDescriptionRow>(
    `INSERT INTO job_descriptions (
      title, department, employment_type, work_mode, location, openings, 
      experience_min, experience_max, education, specialization, 
      required_skills, preferred_skills, responsibilities, requirements, 
      nice_to_have, ai_prompt, is_active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE)
     RETURNING id, title, department, employment_type, work_mode, location, openings, 
               experience_min, experience_max, education, specialization, 
               required_skills, preferred_skills, responsibilities, requirements, 
               nice_to_have, ai_prompt, is_active, created_at, updated_at`,
    [
      jd.title,
      jd.department,
      jd.employment_type,
      jd.work_mode,
      jd.location,
      jd.openings,
      jd.experience_min,
      jd.experience_max,
      jd.education,
      jd.specialization,
      JSON.stringify(jd.required_skills),
      JSON.stringify(jd.preferred_skills),
      jd.responsibilities,
      jd.requirements,
      jd.nice_to_have,
      jd.ai_prompt,
    ]
  );
  return result.rows[0];
}

export async function updateJd(
  id: number,
  jd: {
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
    is_active?: boolean;
  }
): Promise<JobDescriptionRow | null> {
  const result = await pool.query<JobDescriptionRow>(
    `UPDATE job_descriptions
     SET title = $2,
         department = $3,
         employment_type = $4,
         work_mode = $5,
         location = $6,
         openings = $7,
         experience_min = $8,
         experience_max = $9,
         education = $10,
         specialization = $11,
         required_skills = $12,
         preferred_skills = $13,
         responsibilities = $14,
         requirements = $15,
         nice_to_have = $16,
         ai_prompt = $17,
         is_active = COALESCE($18, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, department, employment_type, work_mode, location, openings, 
               experience_min, experience_max, education, specialization, 
               required_skills, preferred_skills, responsibilities, requirements, 
               nice_to_have, ai_prompt, is_active, created_at, updated_at`,
    [
      id,
      jd.title,
      jd.department,
      jd.employment_type,
      jd.work_mode,
      jd.location,
      jd.openings,
      jd.experience_min,
      jd.experience_max,
      jd.education,
      jd.specialization,
      JSON.stringify(jd.required_skills),
      JSON.stringify(jd.preferred_skills),
      jd.responsibilities,
      jd.requirements,
      jd.nice_to_have,
      jd.ai_prompt,
      jd.is_active !== undefined ? jd.is_active : null,
    ]
  );
  return result.rows[0] ?? null;
}

export async function deleteJd(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM job_descriptions WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function toggleJdActive(id: number, active: boolean): Promise<JobDescriptionRow | null> {
  const result = await pool.query<JobDescriptionRow>(
    `UPDATE job_descriptions
     SET is_active = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, department, employment_type, work_mode, location, openings, 
               experience_min, experience_max, education, specialization, 
               required_skills, preferred_skills, responsibilities, requirements, 
               nice_to_have, ai_prompt, is_active, created_at, updated_at`,
    [id, active]
  );
  return result.rows[0] ?? null;
}
