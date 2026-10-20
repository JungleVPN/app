import { describe, expect, it, vi } from 'vitest';
import { googleUserAccessToken } from './google-user-token';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function tokenResponse(accessToken: string, expiresIn = 3599) {
  return new Response(JSON.stringify({ access_token: accessToken, expires_in: expiresIn }));
}

function setup(options: { responses?: Response[] } = {}) {
  const responses = [...(options.responses ?? [tokenResponse('access-1')])];
  const fetchFn = vi.fn(async (_url: string, _init: RequestInit) => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    return next;
  });
  const clock = { now: 1_000_000 };
  const accessToken = googleUserAccessToken(
    { clientId: 'client-1', clientSecret: 'secret-1', refreshToken: 'refresh-1' },
    fetchFn,
    () => clock.now,
  );
  return { accessToken, fetchFn, clock };
}

function sentForm(fetchFn: ReturnType<typeof setup>['fetchFn'], call = 0): Record<string, string> {
  const [, init] = fetchFn.mock.calls[call];
  return Object.fromEntries(new URLSearchParams(String(init.body)));
}

describe('googleUserAccessToken — access tokens for a Google-signed-in user', () => {
  it('redeems the refresh token at Google’s token endpoint', async () => {
    const { accessToken, fetchFn } = setup();

    await expect(accessToken()).resolves.toBe('access-1');

    expect(fetchFn).toHaveBeenCalledWith(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: expect.any(String),
    });
    expect(sentForm(fetchFn)).toEqual({
      client_id: 'client-1',
      client_secret: 'secret-1',
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
    });
  });

  it('reuses the access token until shortly before it expires', async () => {
    const { accessToken, fetchFn, clock } = setup({
      responses: [tokenResponse('access-1', 3600), tokenResponse('access-2')],
    });

    await accessToken();
    clock.now += (3600 - 61) * 1000;
    await expect(accessToken()).resolves.toBe('access-1');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    clock.now += 1000;
    await expect(accessToken()).resolves.toBe('access-2');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('keeps redeeming the same refresh token', async () => {
    const { accessToken, fetchFn, clock } = setup({
      responses: [tokenResponse('access-1'), tokenResponse('access-2')],
    });

    await accessToken();
    clock.now += 3600 * 1000;
    await accessToken();

    expect(sentForm(fetchFn, 1)).toMatchObject({ refresh_token: 'refresh-1' });
  });

  it('fails when Google answers without an access token', async () => {
    const { accessToken } = setup({ responses: [new Response('{"token_type":"Bearer"}')] });

    await expect(accessToken()).rejects.toThrow('Google token refresh returned no token');
  });

  it('fails with Google’s explanation when the refresh token is refused', async () => {
    const { accessToken } = setup({
      responses: [new Response('{"error":"invalid_grant"}', { status: 400 })],
    });

    await expect(accessToken()).rejects.toThrow(
      'Google token refresh failed — HTTP 400: {"error":"invalid_grant"}',
    );
  });
});
