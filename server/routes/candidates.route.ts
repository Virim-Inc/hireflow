import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as candidateService from '../services/candidate.service.js';
import type { CandidatesQuery, UpdateStageBody, EmptyParams } from '../types/candidate.types.js';

const router = Router();

// GET /api/candidates
router.get(
  '/',
  async (req: Request<EmptyParams, unknown, unknown, CandidatesQuery>, res: Response, next: NextFunction) => {
    try {
      const result = await candidateService.listCandidates(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/candidates/meta  — must be before /:id to avoid route conflict
router.get('/meta', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const meta = await candidateService.getCandidateMeta();
    res.json(meta);
  } catch (err) {
    next(err);
  }
});

// GET /api/candidates/:id
router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = candidateService.parseCandidateId(req.params.id);
    const candidate = await candidateService.getCandidateById(id);
    res.json(candidate);
  } catch (err) {
    next(err);
  }
});

// GET /api/candidates/:id/history
router.get('/:id/history', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = candidateService.parseCandidateId(req.params.id);
    const history = await candidateService.getCandidateHistory(id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/candidates/:id/stage
router.patch(
  '/:id/stage',
  async (req: Request<{ id: string }, unknown, UpdateStageBody>, res: Response, next: NextFunction) => {
    try {
      const id = candidateService.parseCandidateId(req.params.id);
      const { stage, note } = req.body;
      const candidate = await candidateService.moveStage(id, stage, note);
      res.json(candidate);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
