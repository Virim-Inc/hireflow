import * as referralsService from '../services/referrals.service.js';
import { pool } from '../config/db.js';

async function main() {
  console.log('--- Testing Referral Service ---');

  // 1. Get first candidate
  const candRes = await pool.query('SELECT id, candidate_name, email FROM candidates LIMIT 1');
  if (candRes.rows.length === 0) {
    console.log('No candidates found to test referral.');
    await pool.end();
    return;
  }
  const candidate = candRes.rows[0];
  console.log(`Testing with candidate: ${candidate.candidate_name} (#${candidate.id})`);

  // 2. Get first partner company (Stripe)
  const comps = await referralsService.getPartnerCompanies();
  const stripe = comps[0];
  console.log(`Target company: ${stripe.name} (ID: ${stripe.id})`);

  // 3. Clear any existing test referrals for this candidate & stripe
  await pool.query('DELETE FROM candidate_referrals WHERE candidate_id = $1 AND company_id = $2', [candidate.id, stripe.id]);

  // 4. Create referral
  const referral = await referralsService.createReferral({
    candidate_id: candidate.id,
    company_id: stripe.id,
    rounds: [
      { name: 'Resume Screening', cleared: true },
      { name: 'Flowmingo AI Assessment', cleared: true, score: 8.5 },
      { name: 'System Design', cleared: true, score: 9.0 },
    ],
    overall_review: 'Exceptional candidate with deep TypeScript and PostgreSQL knowledge.',
    key_strengths: 'System Architecture, React, Clean Code',
    suggested_roles: 'Senior Full Stack Engineer',
    notes: 'Available to join in 2 weeks',
  }, 1);

  console.log('\n✓ Created referral:', {
    id: referral.id,
    candidate: referral.candidate_name,
    company: referral.company_name,
    status: referral.status,
    rounds: referral.rounds_cleared,
  });

  // 5. Test duplicate active referral rejection
  try {
    await referralsService.createReferral({
      candidate_id: candidate.id,
      company_id: stripe.id,
      rounds: [],
      overall_review: 'Duplicate test',
    }, 1);
    console.error('❌ Failed: duplicate referral should have been rejected!');
  } catch (err: any) {
    console.log('\n✓ Duplicate active referral correctly blocked with error:', err.message);
  }

  // 6. Test status transition & history
  console.log('\nTransitioning status to "interviewing"...');
  await referralsService.updateReferralStatus(referral.id, 'interviewing', 'Candidate passed first technical screen with Stripe engineer.', 1);

  const full = await referralsService.getReferralById(referral.id);
  console.log('✓ Referral status updated to:', full.status);
  console.log('✓ Status history timeline:');
  for (const h of full.history || []) {
    console.log(`  - ${h.old_status || 'initial'} -> ${h.new_status} (Note: "${h.note}")`);
  }

  // 7. Check metrics
  const metrics = await referralsService.getReferralMetrics();
  console.log('\n✓ Aggregated Metrics:', metrics);

  await pool.end();
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
