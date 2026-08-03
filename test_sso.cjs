const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

// 1. Load .env.local variables
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const parts = trimmed.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const PMS_SSO_SECRET = env['PMS_SSO_SECRET'] || 'HireFlowSsoSecretSuperSecureSharedSecretKey2026!#';
const API_PORT = env['API_PORT'] || '3001';
const BASE_URL = `http://localhost:${API_PORT}/api/auth`;

const dbConfig = {
  host: env['PG_HOST'] || 'localhost',
  port: parseInt(env['PG_PORT'] || '5432', 10),
  database: env['PG_DATABASE'] || 'hireflow',
  user: env['PG_USER'] || 'hireflow',
  password: env['PG_PASSWORD'],
  ssl: env['PG_SSL'] === 'false' ? false : { rejectUnauthorized: false }
};

async function runTests() {
  console.log('====================================================');
  console.log('       HireFlow SSO Integration Security Tests       ');
  console.log('====================================================');

  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('Connected to PostgreSQL Database successfully.');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL Database:', err.message);
    process.exit(1);
  }

  // Helper helper to clean test state
  const cleanTestState = async () => {
    await client.query("DELETE FROM admin_users WHERE email IN ('jit-sso-test@example.com', 'conflict-test@example.com')");
    await client.query("DELETE FROM sso_token_usages WHERE jti LIKE 'test-jti-%'");
  };

  // ─── Test 1.1: Happy Path JIT Account Provisioning ───
  console.log('\n[TEST 1.1] First-Time SSO Login & JIT Account Provisioning...');
  await cleanTestState();

  const jti1 = 'test-jti-11';
  const token1 = jwt.sign(
    {
      sub: 'pms-user-id-999',
      email: 'jit-sso-test@example.com',
      name: 'JIT SSO Test User',
      permissions: ['linked_product.hireflow'],
      hireflow_role: 'recruiter',
      jti: jti1
    },
    PMS_SSO_SECRET,
    { algorithm: 'HS256', issuer: 'PMS-Virim', audience: 'HireFlow', expiresIn: '60s' }
  );

  let res = await fetch(`${BASE_URL}/sso-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token1 })
  });

  let status = res.status;
  let data = await res.json();

  if (status === 200 && data.user.email === 'jit-sso-test@example.com') {
    // Check DB
    const dbRes = await client.query("SELECT * FROM admin_users WHERE email = 'jit-sso-test@example.com'");
    const user = dbRes.rows[0];
    if (user && user.pms_user_id === 'pms-user-id-999' && user.auth_provider === 'pms_sso' && user.role === 'admin') {
      console.log('   => SUCCESS: JIT user successfully provisioned in DB with role admin!');
    } else {
      console.log('   => FAIL: User record mismatch in database:', user);
    }
  } else {
    console.log('   => FAIL: SSO JIT request failed. Status:', status, data);
  }


  // ─── Test 1.4: Dynamic Role Sync ───
  console.log('\n[TEST 1.4] Dynamic Role Sync from recruiter (admin) to interviewer (user)...');
  const jtiRoleSync = 'test-jti-rolesync';
  const tokenRoleSync = jwt.sign(
    {
      sub: 'pms-user-id-999',
      email: 'jit-sso-test@example.com',
      name: 'JIT SSO Test User',
      permissions: ['linked_product.hireflow'],
      hireflow_role: 'interviewer', // Mapped to 'user'
      jti: jtiRoleSync
    },
    PMS_SSO_SECRET,
    { algorithm: 'HS256', issuer: 'PMS-Virim', audience: 'HireFlow', expiresIn: '60s' }
  );

  res = await fetch(`${BASE_URL}/sso-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenRoleSync })
  });
  status = res.status;
  data = await res.json();

  if (status === 200 && data.user.role === 'user') {
    const dbRes = await client.query("SELECT role FROM admin_users WHERE email = 'jit-sso-test@example.com'");
    if (dbRes.rows[0]?.role === 'user') {
      console.log('   => SUCCESS: Role successfully synchronized dynamically to user!');
    } else {
      console.log('   => FAIL: Role failed to sync in DB:', dbRes.rows[0]);
    }
  } else {
    console.log('   => FAIL: Role sync request failed. Status:', status, data);
  }


  // ─── Test 2.1: Token Replay Attack ───
  console.log('\n[TEST 2.1] Token Replay Attack Rejection...');
  res = await fetch(`${BASE_URL}/sso-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token1 })
  });
  status = res.status;
  data = await res.json();

  if (status === 401 && data.error && data.error.includes('Token replay detected')) {
    console.log('   => SUCCESS: Replay attack blocked: Token replay detected.');
  } else {
    console.log('   => FAIL: Replay attack was NOT blocked correctly. Status:', status, data);
  }


  // ─── Test 2.2: Expired Token ───
  console.log('\n[TEST 2.2] Expired Token Validation...');
  const tokenExpired = jwt.sign(
    {
      sub: 'pms-user-id-999',
      email: 'jit-sso-test@example.com',
      permissions: ['linked_product.hireflow'],
      jti: 'test-jti-expired',
      exp: Math.floor(Date.now() / 1000) - 10
    },
    PMS_SSO_SECRET,
    { algorithm: 'HS256', issuer: 'PMS-Virim', audience: 'HireFlow' }
  );

  res = await fetch(`${BASE_URL}/sso-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenExpired })
  });
  status = res.status;
  data = await res.json();

  if (status === 401 && data.error && data.error.includes('Invalid or expired token')) {
    console.log('   => SUCCESS: Expired token blocked: Invalid or expired token.');
  } else {
    console.log('   => FAIL: Expired token was NOT blocked correctly. Status:', status, data);
  }


  // ─── Test 2.3: Signature & Claims Tampering ───
  console.log('\n[TEST 2.3] Signature Tampering rejection...');
  const tokenTampered = jwt.sign(
    {
      sub: 'pms-user-id-999',
      email: 'jit-sso-test@example.com',
      permissions: ['linked_product.hireflow'],
      jti: 'test-jti-tampered'
    },
    'WRONG_SECRET_KEY_HERE',
    { algorithm: 'HS256', issuer: 'PMS-Virim', audience: 'HireFlow', expiresIn: '60s' }
  );

  res = await fetch(`${BASE_URL}/sso-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenTampered })
  });
  status = res.status;
  data = await res.json();

  if (status === 401 && data.error && data.error.includes('Invalid or expired token')) {
    console.log('   => SUCCESS: Tampered signature blocked: Invalid or expired token.');
  } else {
    console.log('   => FAIL: Tampered signature was NOT blocked correctly. Status:', status, data);
  }


  // ─── Test 2.4: Missing Permissions ───
  console.log('\n[TEST 2.4] Missing product permissions...');
  const tokenNoPerm = jwt.sign(
    {
      sub: 'pms-user-id-999',
      email: 'jit-sso-test@example.com',
      permissions: ['linked_product.another_app'],
      jti: 'test-jti-noperm'
    },
    PMS_SSO_SECRET,
    { algorithm: 'HS256', issuer: 'PMS-Virim', audience: 'HireFlow', expiresIn: '60s' }
  );

  res = await fetch(`${BASE_URL}/sso-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenNoPerm })
  });
  status = res.status;
  data = await res.json();

  if (status === 403 && data.error && data.error.includes('Missing HireFlow permission')) {
    console.log('   => SUCCESS: Missing permission blocked: Missing HireFlow permission.');
  } else {
    console.log('   => FAIL: Missing permission was NOT blocked correctly. Status:', status, data);
  }


  // ─── Test 3.1: Inactive User Check ───
  console.log('\n[TEST 3.1] Blocked / Inactive User rejection...');
  await client.query("UPDATE admin_users SET is_active = false WHERE email = 'jit-sso-test@example.com'");

  const jtiInactive = 'test-jti-inactive';
  const tokenInactive = jwt.sign(
    {
      sub: 'pms-user-id-999',
      email: 'jit-sso-test@example.com',
      permissions: ['linked_product.hireflow'],
      jti: jtiInactive
    },
    PMS_SSO_SECRET,
    { algorithm: 'HS256', issuer: 'PMS-Virim', audience: 'HireFlow', expiresIn: '60s' }
  );

  res = await fetch(`${BASE_URL}/sso-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenInactive })
  });
  status = res.status;
  data = await res.json();

  if (status === 403 && data.error && data.error.includes('account is inactive')) {
    console.log('   => SUCCESS: Inactive user blocked: account is inactive.');
  } else {
    console.log('   => FAIL: Inactive user was NOT blocked correctly. Status:', status, data);
  }


  // ─── Test 3.2: Duplicate Account Security Conflict ───
  console.log('\n[TEST 3.2] Duplicate Account Identity Conflict...');
  await client.query("INSERT INTO admin_users (email, pms_user_id, name, role, auth_provider) VALUES ('conflict-test@example.com', 'sub-primary', 'Conflict User', 'viewer', 'pms_sso')");

  const jtiConflict = 'test-jti-conflict';
  const tokenConflict = jwt.sign(
    {
      sub: 'sub-hacker-456',
      email: 'conflict-test@example.com',
      permissions: ['linked_product.hireflow'],
      jti: jtiConflict
    },
    PMS_SSO_SECRET,
    { algorithm: 'HS256', issuer: 'PMS-Virim', audience: 'HireFlow', expiresIn: '60s' }
  );

  res = await fetch(`${BASE_URL}/sso-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenConflict })
  });
  status = res.status;
  data = await res.json();

  if (status === 409 && data.error && data.error.includes('already linked to another identity')) {
    console.log('   => SUCCESS: Identity conflict hijacking attempt blocked with 409 Conflict!');
  } else {
    console.log('   => FAIL: Conflict attempt was NOT blocked correctly. Status:', status, data);
  }


  // ─── Test 3.3: Traditional Login Bypass ───
  console.log('\n[TEST 3.3] Traditional Login Bypass block...');
  res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jit-sso-test@example.com', password: 'password123' })
  });
  status = res.status;
  data = await res.json();

  if (status === 405 && data.error && data.error.includes('Local login is disabled')) {
    console.log('   => SUCCESS: Traditional credential login correctly rejected with 405 Method Not Allowed.');
  } else {
    console.log('   => FAIL: Traditional login bypass was NOT rejected correctly. Status:', status, data);
  }


  // ─── Test 3.4: Rate Limiting ───
  console.log('\n[TEST 3.4] Rate Limiting (10 requests/min per IP)...');
  console.log('   Sending 12 rapid SSO requests to verify rate limits...');
  let hitRateLimit = false;
  for (let i = 0; i < 12; i++) {
    const tokenLimit = jwt.sign(
      {
        sub: 'pms-user-id-999',
        email: 'jit-sso-test@example.com',
        permissions: ['linked_product.hireflow'],
        jti: `test-jti-limit-${i}`
      },
      PMS_SSO_SECRET,
      { algorithm: 'HS256', issuer: 'PMS-Virim', audience: 'HireFlow', expiresIn: '60s' }
    );
    res = await fetch(`${BASE_URL}/sso-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenLimit })
    });
    if (res.status === 429) {
      hitRateLimit = true;
      const errData = await res.json();
      console.log(`   => SUCCESS: Rate limit kicked in at request #${i + 1} with status 429: ${errData.error}`);
      break;
    }
  }
  if (!hitRateLimit) {
    console.log('   => FAIL: Rate limiting did NOT block requests.');
  }

  // Cleanup database state
  await cleanTestState();
  await client.end();
  console.log('\nAll integration tests complete!');
}

runTests().catch(err => {
  console.error('Error running test script:', err);
});
