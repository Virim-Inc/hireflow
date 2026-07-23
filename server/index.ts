/**
 * HireFlow API — Entry Point
 *
 * Responsibilities of this file:
 *   1. Load config (env.ts handles dotenv + validation)
 *   2. Verify database connectivity
 *   3. Run any pending SQL migrations
 *   4. Wire Express middleware
 *   5. Mount route modules
 *   6. Start the HTTP listener
 *
 * Nothing else belongs here. Business logic lives in services/,
 * SQL lives in repositories/, HTTP routing lives in routes/.
 */

// config/env.ts must be the very first import — it loads dotenv.
import { config } from './config/env.js';
import { testConnection } from './config/db.js';
import { runMigrations } from './db/migrate.js';

import express from 'express';
import cors from 'cors';

import healthRouter from './routes/health.route.js';
import candidatesRouter from './routes/candidates.route.js';
import statsRouter from './routes/stats.route.js';
import authRouter from './routes/auth.route.js';
import jdRouter from './routes/jd.route.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

async function startServer(): Promise<void> {
  // 1. Verify DB is reachable (logs connection info)
  await testConnection();

  // 2. Run pending migrations (idempotent — skips already-applied files)
  console.log('\nRunning migrations...');
  await runMigrations();

  // 3. Build the Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 4. Mount routers
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/candidates', requireAuth, candidatesRouter);
  app.use('/api/stats', requireAuth, statsRouter);
  app.use('/api/job-descriptions', requireAuth, jdRouter);

  // 5. Central error handler — must be last middleware
  app.use(errorHandler);

  // 6. Start listening
  app.listen(config.port, config.host, () => {
    console.log(`\nHiring API running on ${config.host}:${config.port}`);
    console.log('  Endpoints: /api/health, /api/candidates, /api/candidates/meta, /api/stats\n');
  });
}

startServer().catch((err: unknown) => {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('\nFailed to start Hiring API:', error.message);
  process.exit(1);
});
