import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
const router = Router();
// In-memory rate limiter: 10 requests per minute per IP
const rateLimitMap = new Map();
function ssoRateLimiter(req, _res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const limitWindow = 60 * 1000;
    const maxRequests = 10;
    const clientData = rateLimitMap.get(ip);
    if (!clientData || now > clientData.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + limitWindow });
        return next();
    }
    clientData.count++;
    if (clientData.count > maxRequests) {
        return next(new HttpError(429, 'Too many login attempts. Please try again later.'));
    }
    next();
}
// Disable local login endpoint completely
router.post('/login', (_req, _res, next) => {
    next(new HttpError(405, 'Local login is disabled. Please login via the PMS Portal.'));
});
// SSO Verification Route
router.post('/sso-verify', ssoRateLimiter, async (req, res, next) => {
    const { token } = req.body;
    if (typeof token !== 'string' || !token.trim() || token.length > 4096) {
        return next(new HttpError(400, 'Invalid token payload.'));
    }
    try {
        const result = await authService.ssoVerify(token);
        res.json(result);
    }
    catch (err) {
        if (err instanceof HttpError)
            return next(err);
        next(new HttpError(401, 'Authentication failed. Please contact your system administrator.'));
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