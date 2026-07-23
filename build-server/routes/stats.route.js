import { Router } from 'express';
import { getStats } from '../services/stats.service.js';
const router = Router();
router.get('/', async (_req, res, next) => {
    try {
        const stats = await getStats();
        res.json(stats);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=stats.route.js.map