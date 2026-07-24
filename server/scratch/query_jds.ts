import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function queryJds() {
  const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 5432),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT id, title, is_active FROM job_descriptions ORDER BY id;');
    console.log('Job Descriptions in DB:');
    console.log(res.rows);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

queryJds();
