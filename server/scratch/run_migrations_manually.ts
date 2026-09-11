import { runMigrations } from '../db/migrate.js';
import { testConnection } from '../config/db.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  await testConnection();
  console.log('Running migrations manually...');
  await runMigrations();
  console.log('Done!');
}

main().catch(console.error);
