import { readdir, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

/**
 * Ensures the schema_migrations tracking table exists.
 * This table records which SQL files have been applied so each migration
 * runs exactly once — never re-executed on subsequent server starts.
 */
async function ensureTrackingTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL        PRIMARY KEY,
      filename   TEXT          UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const res = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY id',
  );
  return new Set(res.rows.map((r) => r.filename));
}

/**
 * Reads all *.sql files from the migrations/ directory in alphabetical order
 * and applies any that have not been recorded in schema_migrations.
 * Each migration runs inside a transaction so a failure is fully rolled back.
 */
export async function runMigrations(): Promise<void> {
  await ensureTrackingTable();
  const applied = await getAppliedMigrations();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort(); // alphabetical = chronological since files are numbered

  let pendingCount = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    pendingCount++;
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  [migrate] ✓ Applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration "${file}" failed: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  if (pendingCount === 0) {
    console.log('  [migrate] All migrations already applied.');
  }
}
