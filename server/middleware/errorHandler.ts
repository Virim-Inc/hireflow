import type { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for intentional HTTP errors thrown by services.
 * The errorHandler middleware reads statusCode to set the response status.
 *
 * Usage:  throw new HttpError(404, 'Candidate not found');
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Central Express error handler.
 * Replaces the 7 duplicated try/catch blocks that previously existed in index.ts.
 * Register this AFTER all routes:  app.use(errorHandler);
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const error = err instanceof Error ? err : new Error(String(err));
  console.error('[500]', error.message);
  res.status(500).json({ error: error.message });
}
