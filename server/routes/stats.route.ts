import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { getStats } from '../services/stats.service.js';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;
