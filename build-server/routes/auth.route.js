import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await authService.getCurrentUser(userId);
        res.json({ user });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=auth.route.js.map