import { pool } from '../config/db.js';
import * as candidateRepo from '../repositories/candidate.repo.js';
import * as emailService from './email.service.js';
import { PIPELINE_STAGES, isPipelineStage } from '../types/candidate.types.js';
import type {
  CandidateRow,
  CandidateHistoryRow,
  CandidatesQuery,
  PipelineStage,
} from '../types/candidate.types.js';
import { HttpError } from '../middleware/errorHandler.js';

// ── Parse helpers ─────────────────────────────────────────────────────────────

export function parseInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function parseCandidateId(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'Invalid candidate id');
  }
  return parsed;
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listCandidates(query: CandidatesQuery): Promise<{
  data: CandidateRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const pageNum = parseInteger(query.page, 1, 1, 99999);
  const limitNum = parseInteger(query.limit, 20, 1, 200);
  const sortKey = query.sort ?? 'processed_at';
  const safeSort = candidateRepo.SORT_COLUMNS[sortKey] ?? 'processed_at';
  const safeOrder = query.order === 'asc' ? 'ASC' : 'DESC';

  const { rows, total } = await candidateRepo.findCandidates(
    query,
    pageNum,
    limitNum,
    safeSort,
    safeOrder,
  );

  return {
    data: rows,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
}

export async function getCandidateById(id: number): Promise<CandidateRow> {
  const candidate = await candidateRepo.findCandidateById(pool, id);
  if (!candidate) throw new HttpError(404, 'Candidate not found');
  return candidate;
}

export async function getCandidateMeta(): Promise<{
  positions: string[];
  stages: readonly PipelineStage[];
  sources: string[];
  skills: string[];
  cities: string[];
  colleges: string[];
  degrees: string[];
  passoutYears: number[];
}> {
  const meta = await candidateRepo.findCandidateMeta();
  return {
    ...meta,
    stages: PIPELINE_STAGES,
    sources: ['workdrive', 'email'],
  };
}

export async function getCandidateHistory(id: number): Promise<CandidateHistoryRow[]> {
  return candidateRepo.findCandidateHistory(id);
}

export async function moveStage(
  id: number,
  stage: string | undefined,
  noteRaw: string | undefined,
): Promise<CandidateRow> {
  if (!isPipelineStage(stage)) {
    throw new HttpError(400, 'Invalid stage value');
  }
  const note = noteRaw?.trim() || null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentStage = await candidateRepo.lockCandidateStage(client, id);
    if (currentStage === null) {
      throw new HttpError(404, 'Candidate not found');
    }
    if (currentStage === stage && !note) {
      throw new HttpError(400, 'Candidate is already in that stage');
    }

    await candidateRepo.updateCandidateStage(client, id, stage, note);
    await candidateRepo.insertStageHistory(client, id, currentStage, stage, note);
    await client.query('COMMIT');

    const updated = await candidateRepo.findCandidateById(client, id);
    return updated!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function scheduleCandidateTest(
  id: number,
  data: {
    candidateName?: string;
    candidateEmail?: string;
    position?: string;
    positionLabel?: string;
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes?: number;
    notes?: string;
    meetingLink?: string;
    customSubject?: string;
    customBody?: string;
  },
): Promise<{
  candidate: CandidateRow;
  emailStatus: { sent: boolean; messageId?: string; simulated?: boolean };
}> {
  if (!data.scheduledDate || !data.scheduledTime) {
    throw new HttpError(400, 'Scheduled date and time are required.');
  }

  const candidate = await getCandidateById(id);
  const targetName = data.candidateName?.trim() || candidate.candidate_name;
  const targetEmail = data.candidateEmail?.trim() || candidate.email;
  const rawPosition = data.position?.trim() || data.positionLabel?.trim() || candidate.position_label || candidate.position;
  const finalPosition = emailService.cleanPosition(rawPosition);
  const duration = data.durationMinutes || 60;
  const meetingLink = data.meetingLink?.trim() || candidate.scheduled_test_link || undefined;

  // Send email notification to candidate
  const emailStatus = await emailService.sendTestScheduleEmail({
    candidateName: targetName,
    candidateEmail: targetEmail,
    positionLabel: finalPosition,
    scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime,
    durationMinutes: duration,
    customNotes: data.notes,
    meetingLink,
    customSubject: data.customSubject,
    customBody: data.customBody,
  });

  // Calculate parsed date timestamp if possible
  let scheduledAt: Date | null = null;
  try {
    const combined = new Date(`${data.scheduledDate} ${data.scheduledTime}`);
    if (!isNaN(combined.getTime())) {
      scheduledAt = combined;
    }
  } catch {
    scheduledAt = null;
  }

  // Update candidate test schedule record
  const updatedCandidate = await candidateRepo.updateCandidateTestSchedule(id, {
    candidateName: data.candidateName?.trim() || undefined,
    candidateEmail: data.candidateEmail?.trim() || undefined,
    position: finalPosition,
    scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime,
    scheduledAt,
    durationMinutes: duration,
    notes: data.notes,
    meetingLink,
  });

  // Automatically advance candidate stage to 'in_person_interview' if not already hired/rejected
  if (
    candidate.pipeline_stage !== 'in_person_interview' &&
    candidate.pipeline_stage !== 'hired' &&
    candidate.pipeline_stage !== 'rejected'
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const testNoteText = `Technical test scheduled for ${data.scheduledDate} at ${data.scheduledTime}`;
      const combinedNote = candidate.latest_stage_note?.trim()
        ? `${candidate.latest_stage_note.trim()}\n\n${testNoteText}`
        : testNoteText;

      await candidateRepo.updateCandidateStage(
        client,
        id,
        'in_person_interview',
        combinedNote,
      );
      await candidateRepo.insertStageHistory(
        client,
        id,
        candidate.pipeline_stage,
        'in_person_interview',
        testNoteText,
      );
      await client.query('COMMIT');
      if (updatedCandidate) {
        updatedCandidate.pipeline_stage = 'in_person_interview';
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Failed to transition candidate stage on test schedule:', err);
    } finally {
      client.release();
    }
  }

  return {
    candidate: updatedCandidate || candidate,
    emailStatus,
  };
}

