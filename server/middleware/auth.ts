import type { Request, Response, NextFunction } from 'express';
import { HttpError } from './errorHandler.js';
import * as authService from '../services/auth.service.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string | null;
  };
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new HttpError(401, 'Unauthorized: Missing or invalid token format'));
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await authService.verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (err) {
    next(err);
  }
}
