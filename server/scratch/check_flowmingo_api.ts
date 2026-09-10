// server/scratch/check_flowmingo_api.ts
import { config } from '../config/env.js';

async function main() {
  const { apiKey, baseUrl } = config.flowmingo;
  console.log('Flowmingo Base URL:', baseUrl);
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NONE');

  // Check candidate / contact endpoints
  const endpoints = [
    '/company/integration/interview/set/v1',
    '/company/integration/contact/v1',
    '/company/integration/candidate/v1',
  ];

  for (const ep of endpoints) {
    const url = `${baseUrl.replace(/\/$/, '')}${ep}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey },
      });
      console.log(`GET ${ep} => status: ${res.status}`);
      if (res.ok) {
        const d = await res.json();
        console.log(`Response ${ep}:`, JSON.stringify(d).slice(0, 300));
      }
    } catch (e: any) {
      console.log(`Error ${ep}:`, e.message);
    }
  }
  process.exit(0);
}

main();
