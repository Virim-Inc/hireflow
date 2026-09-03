import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as referralsService from '../services/referrals.service.js';
import * as referralsRepo from '../repositories/referrals.repo.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/referrals/companies
 * List all active partner companies.
 */
router.get('/companies', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await referralsService.getPartnerCompanies();
    res.json(companies);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/referrals/companies
 * Create a new partner company.
 */
router.post('/companies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await referralsService.createPartnerCompany(req.body);
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/referrals/metrics
 * Get referral counters and metrics.
 */
router.get('/metrics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await referralsService.getReferralMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/referrals/candidate-tags
 * Get active referral company badges for a batch of candidate IDs.
 */
router.get('/candidate-tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) {
      res.json({});
      return;
    }
    const ids = idsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    const tags = await referralsRepo.getActiveReferralCompaniesForCandidates(ids);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/referrals
 * List candidate referrals with pagination, search, status, and company filters.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const companyId = req.query.company_id ? parseInt(req.query.company_id as string, 10) : undefined;
    const candidateId = req.query.candidate_id ? parseInt(req.query.candidate_id as string, 10) : undefined;

    const result = await referralsService.getReferrals({
      page,
      limit,
      search,
      status,
      companyId,
      candidateId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/referrals/candidate/:candidateId
 * Get all referrals for a specific candidate.
 */
router.get('/candidate/:candidateId', async (req: Request<{ candidateId: string }>, res: Response, next: NextFunction) => {
  try {
    const candidateId = parseInt(req.params.candidateId, 10);
    if (isNaN(candidateId)) {
      res.status(400).json({ error: 'Invalid candidateId parameter.' });
      return;
    }
    const referrals = await referralsService.getReferralsForCandidate(candidateId);
    res.json(referrals);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/referrals/:id
 * Get single referral by ID with history timeline.
 */
router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid referral ID.' });
      return;
    }
    const referral = await referralsService.getReferralById(id);
    res.json(referral);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/referrals
 * Create a new candidate referral.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const referredById = authReq.user?.id || null;
    const referral = await referralsService.createReferral(req.body, referredById);
    res.status(201).json(referral);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/referrals/:id/status
 * Transition referral status and record timeline history.
 */
router.patch('/:id/status', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid referral ID.' });
      return;
    }
    const { status, note } = req.body;
    const authReq = req as AuthenticatedRequest;
    const changedById = authReq.user?.id || null;

    const updated = await referralsService.updateReferralStatus(id, status, note, changedById);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
