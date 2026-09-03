import { pool } from '../config/db.js';
import * as flowmingoRepo from '../repositories/flowmingo.repo.js';

async function main() {
  console.log('--- Syncing Arpita Rawat Data ---');
  
  // Consolidate row 5 and row 6
  const subUrl = 'https://team.flowmingo.ai/company/ai-interview-candidates?set_id=20acee36-b33a-4348-bf06-fc1444c0613e&submissionId=b4d25284-a923-400f-9b0e-e7f69c49aa04';
  
  await pool.query(
    `UPDATE flowmingo_invitations 
     SET interview_status = 'completed', 
         submission_url = $1, 
         updated_at = CURRENT_TIMESTAMP 
     WHERE candidate_id = 967`,
    [subUrl]
  );

  // Check details for candidate 967 using repo function
  const details = await flowmingoRepo.getCandidateFlowmingoDetails(967);
  console.log('Candidate 967 Flowmingo Details from repo:', details);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
