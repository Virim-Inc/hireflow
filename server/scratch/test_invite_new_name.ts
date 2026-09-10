// server/scratch/test_invite_new_name.ts
import { config } from '../config/env.js';

async function main() {
  const { apiKey, baseUrl } = config.flowmingo;
  const base = baseUrl.replace(/\/$/, '');

  const payload = {
    com_interview_set_id: '20acee36-b33a-4348-bf06-fc1444c0613e',
    candidates: [
      {
        ats_candidate_id: '9999',
        email: 'priya.sharma.test@viriminfotech.com',
        email_address: 'priya.sharma.test@viriminfotech.com',
        name: 'Priya Sharma',
        full_name: 'Priya Sharma',
        firstname: 'Priya',
        first_name: 'Priya',
        lastname: 'Sharma',
        last_name: 'Sharma',
      },
    ],
    invitation_message: 'Hi Priya, please complete your async AI interview assessment using Flowmingo in the next 48 hours.',
    send_invite: false, // Do not send actual email
  };

  const res = await fetch(`${base}/company/integration/interview/candidate/invite/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  console.log('Invite status:', res.status);
  const data = await res.json();
  console.log('Flowmingo Response:', JSON.stringify(data, null, 2));

  process.exit(0);
}

main();
