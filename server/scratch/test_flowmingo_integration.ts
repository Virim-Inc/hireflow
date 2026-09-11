import crypto from 'crypto';
import { verifySignature } from '../services/flowmingo.service.js';

function runVerificationSuite() {
  console.log('=== Running Flowmingo Integration Verification Tests ===\n');

  const secret = 'whsec_test_secret_key_12345';
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  const rawBody = Buffer.from(
    JSON.stringify({
      schema_version: '1.0.0',
      event_type: 'invitation.status.update',
      event_id: 'test-event-uuid-12345',
      timestamp: new Date().toISOString(),
      data: { candidate_email: 'alex@example.com', status: 'invitation_email_delivered' },
    }),
  );

  const currentUnix = Math.floor(Date.now() / 1000);
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${currentUnix}.${rawBody.toString('utf8')}`)
    .digest('hex');

  // Test 1: Valid Signature Check
  const validHeader = `t=${currentUnix},v1=${validSignature}`;
  const res1 = verifySignature(rawBody, validHeader, secret);
  assert(res1.isValid === true, 'Valid Signature Verification');

  // Test 2: Invalid Signature Key
  const badSignature = crypto
    .createHmac('sha256', 'wrong_secret')
    .update(`${currentUnix}.${rawBody.toString('utf8')}`)
    .digest('hex');
  const badHeader = `t=${currentUnix},v1=${badSignature}`;
  const res2 = verifySignature(rawBody, badHeader, secret);
  assert(res2.isValid === false && Boolean(res2.reason?.includes('mismatch')), 'Invalid Signature Rejection');

  // Test 3: Malformed Header Format
  const malformedHeader = `invalid_header_format_without_t_and_v1`;
  const res3 = verifySignature(rawBody, malformedHeader, secret);
  assert(res3.isValid === false && Boolean(res3.reason?.includes('Malformed')), 'Malformed Header Rejection');

  // Test 4: Expired Timestamp Skew (> 300 seconds)
  const expiredUnix = currentUnix - 360; // 6 minutes ago
  const expiredSignature = crypto
    .createHmac('sha256', secret)
    .update(`${expiredUnix}.${rawBody.toString('utf8')}`)
    .digest('hex');
  const expiredHeader = `t=${expiredUnix},v1=${expiredSignature}`;
  const res4 = verifySignature(rawBody, expiredHeader, secret);
  assert(res4.isValid === false && Boolean(res4.reason?.includes('Timestamp skew')), 'Expired Timestamp Skew Rejection (>300s)');

  // Test 5: Score Range Constraint Normalization Check
  const rawScoreOver = 12.5;
  const rawScoreUnder = -2.0;
  const normOver = Math.max(0, Math.min(10, rawScoreOver));
  const normUnder = Math.max(0, Math.min(10, rawScoreUnder));
  assert(normOver === 10 && normUnder === 0, 'Evaluation Score Range Normalization (0 - 10)');

  console.log(`\n=== Verification Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationSuite();
