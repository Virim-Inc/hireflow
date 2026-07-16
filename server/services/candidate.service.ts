import { pool } from '../config/db.js';
import * as candidateRepo from '../repositories/candidate.repo.js';
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
    sources: ['form', 'email'],
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
