// server/scratch/discover_flowmingo_endpoints.ts
import { config } from '../config/env.js';

async function main() {
  const { apiKey, baseUrl } = config.flowmingo;
  const base = baseUrl.replace(/\/$/, '');

  const candidateId = 'a5eab94b-6aef-4d09-8268-03709d64e727';
  const contactId = '7c3b991b-5289-473b-8caa-9da373d234d9';
  const email = 'akshat.paranjiya@viriminfotech.com';

  const testEndpoints = [
    // Contact updates
    { method: 'PUT', url: `${base}/company/integration/contact/v1/${contactId}`, body: { name: 'Akshat Paranjiya', firstname: 'Akshat', lastname: 'Paranjiya' } },
    { method: 'PATCH', url: `${base}/company/integration/contact/v1/${contactId}`, body: { name: 'Akshat Paranjiya', firstname: 'Akshat', lastname: 'Paranjiya' } },
    { method: 'POST', url: `${base}/company/integration/contact/v1`, body: { email, name: 'Akshat Paranjiya', firstname: 'Akshat', lastname: 'Paranjiya' } },
    { method: 'PUT', url: `${base}/company/integration/candidate/v1/${candidateId}`, body: { name: 'Akshat Paranjiya', firstname: 'Akshat', lastname: 'Paranjiya' } },
    { method: 'PATCH', url: `${base}/company/integration/candidate/v1/${candidateId}`, body: { name: 'Akshat Paranjiya', firstname: 'Akshat', lastname: 'Paranjiya' } },
    // Talent updates
    { method: 'PUT', url: `${base}/company/integration/interview/candidate/v1/${candidateId}`, body: { name: 'Akshat Paranjiya' } },
    { method: 'PATCH', url: `${base}/company/integration/interview/candidate/v1/${candidateId}`, body: { name: 'Akshat Paranjiya' } },
    { method: 'PUT', url: `${base}/company/integration/interview/candidate/v1`, body: { tal_candidate_id: candidateId, name: 'Akshat Paranjiya' } },
    { method: 'POST', url: `${base}/company/integration/interview/candidate/update/v1`, body: { tal_candidate_id: candidateId, com_contact_id: contactId, name: 'Akshat Paranjiya', firstname: 'Akshat', lastname: 'Paranjiya' } },
    { method: 'POST', url: `${base}/company/integration/interview/contact/update/v1`, body: { com_contact_id: contactId, name: 'Akshat Paranjiya', firstname: 'Akshat', lastname: 'Paranjiya' } },
  ];

  console.log('Testing Flowmingo candidate/contact update endpoints...');

  for (const t of testEndpoints) {
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(t.body),
      });

      console.log(`${t.method} ${t.url} => ${res.status} ${res.statusText}`);
      if (res.status !== 404) {
        const txt = await res.text();
        console.log('   Response:', txt);
      }
    } catch (e: any) {
      console.log(`Error ${t.method} ${t.url}:`, e.message);
    }
  }

  process.exit(0);
}

main();
