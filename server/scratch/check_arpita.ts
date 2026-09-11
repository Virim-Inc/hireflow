import { pool } from '../config/db.js';

async function main() {
  console.log('=== Checking Candidates named Arpita ===');
  const candRes = await pool.query(
    `SELECT id, candidate_name, email FROM candidates WHERE LOWER(candidate_name) LIKE '%arpita%' OR LOWER(email) LIKE '%arpita%'`
  );
  console.log('Candidates:', candRes.rows);

  console.log('\n=== Checking flowmingo_evaluations Table ===');
  const evalRes = await pool.query(`SELECT * FROM flowmingo_evaluations`);
  console.log('Evaluations:', evalRes.rows);

  console.log('\n=== Checking flowmingo_invitations Table ===');
  const invRes = await pool.query(`SELECT * FROM flowmingo_invitations`);
  console.log('Invitations:', invRes.rows);

  console.log('\n=== Joined Query for Candidate Flowmingo Details ===');
  for (const cand of candRes.rows) {
    const joined = await pool.query(
      `SELECT fi.*, fe.evaluation_score, fe.evaluation_type, fe.submission_url as eval_sub_url
       FROM flowmingo_invitations fi
       LEFT JOIN flowmingo_evaluations fe ON fe.flowmingo_invitation_id = fi.id
       WHERE fi.candidate_id = $1`,
      [cand.id]
    );
    console.log(`Candidate ${cand.id} (${cand.candidate_name}):`, joined.rows);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
