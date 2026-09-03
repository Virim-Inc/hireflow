import { runMigrations } from '../db/migrate.js';
import { pool } from '../config/db.js';

async function main() {
  console.log('Running pending database migrations...');
  await runMigrations();

  const comps = await pool.query('SELECT id, name, slug, industry FROM partner_companies ORDER BY id ASC');
  console.log(`\nSuccessfully loaded ${comps.rows.length} Partner Companies from database:`);
  for (const c of comps.rows) {
    console.log(`  - [ID: ${c.id}] ${c.name} (${c.industry}) [slug: ${c.slug}]`);
  }

  const refsTable = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('partner_companies', 'candidate_referrals', 'candidate_referral_status_history')
  `);
  console.log('\nVerified tables created:', refsTable.rows.map(r => r.table_name));

  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
