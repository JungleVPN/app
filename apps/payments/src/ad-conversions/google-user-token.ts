const TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** Refresh this long before Google's stated expiry, so a token never lapses mid-request. */
const EXPIRY_MARGIN_MS = 60_000;

/** A web OAuth client in our Google Cloud project, and the refresh token a user granted it. */
export type GoogleOAuthClient = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Access tokens for a user who signs in with Google, redeemed from the refresh
 * token they granted. Microsoft Advertising accepts these for a user whose
 * login is a Google account. Google keeps a refresh token valid until it is
 * revoked — but only while the OAuth consent screen is published to
 * production; in testing it lapses after seven days (`invalid_grant`).
 */
export function googleUserAccessToken(
  client: GoogleOAuthClient,
  fetchFn: Fetch = fetch,
  now: () => number = Date.now,
): () => Promise<string> {
  let cached: { token: string; expiresAt: number } | null = null;

  return async () => {
    if (cached && now() < cached.expiresAt) return cached.token;

    const response = await fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: client.refreshToken,
      }).toString(),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Google token refresh failed — HTTP ${response.status}: ${text}`);
    }

    const granted = tokenResponseOf(text);
    cached = {
      token: granted.accessToken,
      expiresAt: now() + granted.expiresInSeconds * 1000 - EXPIRY_MARGIN_MS,
    };
    return granted.accessToken;
  };
}

function tokenResponseOf(text: string): { accessToken: string; expiresInSeconds: number } {
  const body: unknown = JSON.parse(text);
  if (typeof body !== 'object' || body === null) {
    throw new Error('Google token refresh returned no token');
  }
  const accessToken = 'access_token' in body ? body.access_token : undefined;
  const expiresIn = 'expires_in' in body ? body.expires_in : undefined;
  if (typeof accessToken !== 'string' || typeof expiresIn !== 'number') {
    throw new Error('Google token refresh returned no token');
  }
  return { accessToken, expiresInSeconds: expiresIn };
}
