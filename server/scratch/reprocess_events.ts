import { pool } from '../config/db.js';
import * as flowmingoRepo from '../repositories/flowmingo.repo.js';

async function main() {
  console.log('--- Reprocessing Webhook Events for Ryan ---');
  
  // Find candidate by email
  const candRes = await pool.query(`SELECT id, candidate_name, email FROM candidates WHERE LOWER(email) = LOWER($1)`, ['ryanofficial2604@gmail.com']);
  console.log('Candidate search result:', candRes.rows);

  const candidateId = candRes.rows[0]?.id;
  if (!candidateId) {
    console.log('Candidate not found.');
    process.exit(0);
  }

  // Find or create invitation record
  const invRes = await pool.query(
    `SELECT * FROM flowmingo_invitations WHERE candidate_id = $1 ORDER BY created_at DESC`,
    [candidateId]
  );
  console.log('Invitations found:', invRes.rows);

  let invitationId = invRes.rows[0]?.id;
  if (!invitationId) {
    const newInv = await flowmingoRepo.createInvitationRecord({
      candidate_id: candidateId,
      flowmingo_interview_set_id: '20acee36-b33a-4348-bf06-fc1444c0613e',
      flowmingo_candidate_id: 'ae25b8a5-2ba7-4fc0-9caf-9b781779e0a1',
      invitation_status: 'completed',
    });
    invitationId = newInv.id;
  }

  // Update invitation status and URL
  const subUrl = 'https://team.flowmingo.ai/company/ai-interview-candidates?set_id=20acee36-b33a-4348-bf06-fc1444c0613e&submissionId=6455d92f-563c-41d9-af8b-89c8758b72e6';
  await pool.query(
    `UPDATE flowmingo_invitations 
     SET interview_status = 'completed', 
         submission_url = $2, 
         flowmingo_candidate_id = 'ae25b8a5-2ba7-4fc0-9caf-9b781779e0a1',
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [invitationId, subUrl]
  );

  // Upsert evaluation score (4.7)
  const evalRes = await flowmingoRepo.upsertEvaluation(invitationId, 'interview', 4.7, subUrl);
  console.log('Upserted evaluation:', evalRes);

  console.log('Reprocessing completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
