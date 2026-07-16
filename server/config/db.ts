import { Pool } from 'pg';
import { config } from './env.js';

/**
 * Single shared PostgreSQL connection pool for the entire server.
 * Import this wherever a DB connection is needed — never create a new Pool elsewhere.
 */
export const pool = new Pool({
  host: config.pg.host,
  port: config.pg.port,
  database: config.pg.database,
  user: config.pg.user,
  password: config.pg.password,
  ssl: config.pg.ssl,
});

pool.on('error', (err: Error) => {
  console.error('[DB] Unexpected pool client error:', err.message);
});

export async function testConnection(): Promise<void> {
  console.log('\nTrying to connect to PostgreSQL with:');
  console.log(`  host:     ${config.pg.host}`);
  console.log(`  port:     ${config.pg.port}`);
  console.log(`  database: ${config.pg.database}`);
  console.log(`  user:     ${config.pg.user}`);
  console.log(`  password: ${config.pg.password ? '***set***' : '(empty)'}`);
  console.log(`  ssl:      ${config.pg.ssl !== false}`);

  const client = await pool.connect();
  try {
    const res = await client.query<{
      current_database: string;
      current_user: string;
      version: string;
    }>('SELECT current_database(), current_user, version()');
    const row = res.rows[0];
    console.log('\nPostgreSQL connected.');
    console.log(`  database: ${row.current_database}`);
    console.log(`  user:     ${row.current_user}`);
    console.log(`  version:  ${row.version.split(' ').slice(0, 2).join(' ')}\n`);
  } finally {
    client.release();
  }
}
