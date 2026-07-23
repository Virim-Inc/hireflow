import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as jdService from '../services/jd.service.js';

const router = Router();

// GET /api/job-descriptions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const active = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const jds = await jdService.listJds({ active, search });
    res.json(jds);
  } catch (err) {
    next(err);
  }
});

// GET /api/job-descriptions/:id
router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const jd = await jdService.getJdById(id);
    res.json(jd);
  } catch (err) {
    next(err);
  }
});

// POST /api/job-descriptions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newJd = await jdService.createJd(req.body);
    res.status(201).json(newJd);
  } catch (err) {
    next(err);
  }
});

// PUT /api/job-descriptions/:id
router.put('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await jdService.updateJd(id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/job-descriptions/:id
router.delete('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    await jdService.deleteJd(id);
    res.json({ success: true, message: 'Job Description deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/job-descriptions/:id/toggle-active
router.patch('/:id/toggle-active', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const active = req.body.is_active === true;
    const updated = await jdService.toggleJdActive(id, active);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
