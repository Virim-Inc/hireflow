import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { pool } from '../config/db.js';
import * as authService from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

const router = Router();

// In-memory rate limiter: 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function ssoRateLimiter(req: any, _res: any, next: any) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
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

/**
 * Local Development 1-Click Login / SSO Bypass.
 * Issues a valid 30-day token for the local admin account.
 */
router.post('/dev-login', async (_req, res, next) => {
  if (config.isProduction || process.env.NODE_ENV === 'production') {
    return next(new HttpError(403, 'Dev login is disabled in production.'));
  }
  try {
    const userResult = await pool.query(
      'SELECT id, email, name, role FROM admin_users WHERE is_active = true AND is_blocked = false ORDER BY id ASC LIMIT 1'
    );
    const user = userResult.rows[0] || {
      id: 1,
      email: 'admin@viriminfotech.com',
      name: 'Dev Admin',
      role: 'admin',
    };
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// Disable local password login endpoint completely
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
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, 'Authentication failed. Please contact your system administrator.'));
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const user = await authService.getCurrentUser(userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
