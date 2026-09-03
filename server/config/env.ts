import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local before anything reads process.env
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', '.env.local') });

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `[config] Missing required environment variable: ${key}\n` +
        `  Add it to your .env.local file.`,
    );
  }
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = Object.freeze({
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  port: Number(optional('API_PORT', '3001')),
  host: optional('API_HOST', '0.0.0.0'),
  pg: Object.freeze({
    host: optional('PG_HOST', 'localhost'),
    port: Number(optional('PG_PORT', '5432')),
    database: optional('PG_DATABASE', 'hireflow'),
    user: optional('PG_USER', 'hireflow'),
    password: required('PG_PASSWORD'),
    ssl:
      process.env.PG_SSL === 'false'
        ? (false as const)
        : ({ rejectUnauthorized: false } as const),
  }),
  jwtSecret: required('JWT_SECRET'),
  sso: Object.freeze({
    pmsSsoSecret: required('PMS_SSO_SECRET'),
    pmsSsoIssuer: optional('PMS_SSO_ISSUER', 'PMS-Virim'),
    pmsSsoAudience: optional('PMS_SSO_AUDIENCE', 'HireFlow'),
  }),
  zoho: Object.freeze({
    clientId: optional('ZOHO_CLIENT_ID', ''),
    clientSecret: optional('ZOHO_CLIENT_SECRET', ''),
    refreshToken: optional('ZOHO_REFRESH_TOKEN', ''),
    dc: optional('ZOHO_DC', 'in'),
  }),
  flowmingo: Object.freeze({
    apiKey: optional('FLOWMINGO_API_KEY', ''),
    baseUrl: optional('FLOWMINGO_BASE_URL', 'https://apis.flowmingo.ai'),
    webhookSecret: optional('FLOWMINGO_WEBHOOK_SECRET', ''),
  }),
  smtp: Object.freeze({
    host: optional('SMTP_HOST', ''),
    port: Number(optional('SMTP_PORT', '465')),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('SMTP_FROM', 'Virim Infotech Hiring Team <hiring@viriminfotech.com>'),
    secure: optional('SMTP_SECURE', 'true') === 'true',
  }),
});
