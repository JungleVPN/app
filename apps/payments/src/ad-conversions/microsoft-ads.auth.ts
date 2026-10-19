const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPE = 'https://ads.microsoft.com/msads.manage offline_access';
/** Refresh this long before Microsoft's stated expiry, so a token never lapses mid-request. */
const EXPIRY_MARGIN_MS = 60_000;

export type MicrosoftOAuthClient = {
  clientId: string;
  /** Set for a web app registration; a public (native) one has none. */
  clientSecret?: string;
  refreshToken: string;
};

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Access tokens for Microsoft Advertising, redeemed from a refresh token.
 * Microsoft may hand back a new refresh token on every refresh; the newest is
 * kept in memory, so after a restart the configured one is used again. A
 * refused refresh token (`invalid_grant`) means the user must consent again.
 */
export function microsoftAccessToken(
  client: MicrosoftOAuthClient,
  fetchFn: Fetch = fetch,
  now: () => number = Date.now,
): () => Promise<string> {
  let refreshToken = client.refreshToken;
  let cached: { token: string; expiresAt: number } | null = null;

  return async () => {
    if (cached && now() < cached.expiresAt) return cached.token;

    const response = await fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: SCOPE,
        ...(client.clientSecret ? { client_secret: client.clientSecret } : {}),
      }).toString(),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Microsoft token refresh failed — HTTP ${response.status}: ${text}`);
    }

    const granted = tokenResponseOf(text);
    refreshToken = granted.refreshToken ?? refreshToken;
    cached = {
      token: granted.accessToken,
      expiresAt: now() + granted.expiresInSeconds * 1000 - EXPIRY_MARGIN_MS,
    };
    return granted.accessToken;
  };
}

function tokenResponseOf(text: string): {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken?: string;
} {
  const body: unknown = JSON.parse(text);
  if (typeof body !== 'object' || body === null) {
    throw new Error('Microsoft token refresh returned no token');
  }
  const accessToken = 'access_token' in body ? body.access_token : undefined;
  const expiresIn = 'expires_in' in body ? body.expires_in : undefined;
  const refreshToken = 'refresh_token' in body ? body.refresh_token : undefined;
  if (typeof accessToken !== 'string' || typeof expiresIn !== 'number') {
    throw new Error('Microsoft token refresh returned no token');
  }
  return {
    accessToken,
    expiresInSeconds: expiresIn,
    ...(typeof refreshToken === 'string' ? { refreshToken } : {}),
  };
}
