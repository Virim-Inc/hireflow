import { Router } from 'express';
import * as candidateService from '../services/candidate.service.js';
const router = Router();
// GET /api/candidates
router.get('/', async (req, res, next) => {
    try {
        const result = await candidateService.listCandidates(req.query);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/candidates/meta  — must be before /:id to avoid route conflict
router.get('/meta', async (_req, res, next) => {
    try {
        const meta = await candidateService.getCandidateMeta();
        res.json(meta);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/candidates/:id
router.get('/:id', async (req, res, next) => {
    try {
        const id = candidateService.parseCandidateId(req.params.id);
        const candidate = await candidateService.getCandidateById(id);
        res.json(candidate);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/candidates/:id/history
router.get('/:id/history', async (req, res, next) => {
    try {
        const id = candidateService.parseCandidateId(req.params.id);
        const history = await candidateService.getCandidateHistory(id);
        res.json(history);
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/candidates/:id/stage
router.patch('/:id/stage', async (req, res, next) => {
    try {
        const id = candidateService.parseCandidateId(req.params.id);
        const { stage, note } = req.body;
        const candidate = await candidateService.moveStage(id, stage, note);
        res.json(candidate);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=candidates.route.js.map