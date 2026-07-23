import { config } from '../config/env.js';
import { HttpError } from '../middleware/errorHandler.js';

let cachedToken: string | null = null;
let tokenExpiryEpoch: number = 0;
let activeRefreshPromise: Promise<string> | null = null;

/**
 * Concurrency-safe helper to fetch or refresh a valid Zoho access token.
 */
export async function getAccessToken(forceRefresh = false): Promise<string> {
  const { clientId, clientSecret, refreshToken, dc } = config.zoho;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new HttpError(500, 'Zoho WorkDrive integration is not configured. Missing credentials in env.');
  }

  // Return cached token if valid (using 1 min buffer)
  if (!forceRefresh && cachedToken && Date.now() < tokenExpiryEpoch - 60000) {
    return cachedToken;
  }

  // Deduplicate concurrent token requests
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      console.log('Refreshing Zoho Access Token...');
      const tokenUrl = `https://accounts.zoho.${dc}/oauth/v2/token`;
      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      });

      const res = await fetch(tokenUrl, {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (!res.ok) {
        throw new HttpError(502, `Failed to refresh Zoho token: ${res.statusText}`);
      }

      const data = await res.json() as { access_token: string; expires_in: number };
      cachedToken = data.access_token;
      tokenExpiryEpoch = Date.now() + (data.expires_in * 1000);
      console.log('Zoho Access Token successfully refreshed. Expiry in:', data.expires_in, 'seconds');
      return cachedToken;
    } catch (error) {
      console.error('Failed to retrieve Zoho access token:', error);
      throw error;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Downloads and returns a file stream response from Zoho WorkDrive.
 * Implements a single-retry mechanism on 401 Unauthorized status.
 */
export async function downloadWorkdriveFile(fileId: string, isRetry = false): Promise<Response> {
  const { dc } = config.zoho;
  const accessToken = await getAccessToken(isRetry);
  
  // verified download endpoint
  const downloadUrl = `https://download.zoho.${dc}/v1/workdrive/download/${fileId}`;

  console.log(`Requesting file from Zoho WorkDrive endpoint: ${downloadUrl}`);
  const res = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Accept': 'application/vnd.api+json',
    },
  });

  if (!res.ok) {
    // If unauthorized, token might have been revoked/expired. Retry once with a forced token refresh.
    if (res.status === 401 && !isRetry) {
      console.warn('Zoho returned 401. Retrying with a forced refreshed token...');
      return downloadWorkdriveFile(fileId, true);
    }
    
    if (res.status === 404) {
      throw new HttpError(404, 'Resume file not found on Zoho WorkDrive.');
    }

    throw new HttpError(
      res.status >= 500 ? 502 : res.status,
      `Zoho WorkDrive download request failed: HTTP ${res.status} ${res.statusText}`
    );
  }

  return res;
}
