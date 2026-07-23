import { pool } from './config/db.js';

async function reset() {
  console.log('Resetting Job Description tables for migration reload...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS candidate_jd_scores CASCADE');
    await client.query('DROP TABLE IF EXISTS job_descriptions CASCADE');
    await client.query('DROP TABLE IF EXISTS candidate_job_matches CASCADE');
    await client.query("DELETE FROM schema_migrations WHERE filename = '007_create_jd_tables.sql'");
    await client.query('COMMIT');
    console.log('Database tables dropped and schema_migrations updated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to reset migrations:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
