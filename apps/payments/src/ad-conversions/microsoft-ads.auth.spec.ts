import { describe, expect, it, vi } from 'vitest';
import { microsoftAccessToken } from './microsoft-ads.auth';

const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

function tokenResponse(accessToken: string, refreshToken?: string, expiresIn = 3600) {
  return new Response(
    JSON.stringify({
      access_token: accessToken,
      expires_in: expiresIn,
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
    }),
  );
}

function setup(options: { clientSecret?: string; responses?: Response[]; startAt?: number } = {}) {
  const responses = [...(options.responses ?? [tokenResponse('access-1', 'refresh-2')])];
  const fetchFn = vi.fn(async (_url: string, _init: RequestInit) => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    return next;
  });
  const clock = { now: options.startAt ?? 1_000_000 };
  const accessToken = microsoftAccessToken(
    {
      clientId: 'client-1',
      refreshToken: 'refresh-1',
      ...(options.clientSecret ? { clientSecret: options.clientSecret } : {}),
    },
    fetchFn,
    () => clock.now,
  );
  return { accessToken, fetchFn, clock };
}

function sentForm(fetchFn: ReturnType<typeof setup>['fetchFn'], call = 0): Record<string, string> {
  const [, init] = fetchFn.mock.calls[call];
  return Object.fromEntries(new URLSearchParams(String(init.body)));
}

describe('microsoftAccessToken — Microsoft Advertising access tokens from a refresh token', () => {
  it('redeems the refresh token for an access token to Microsoft Advertising', async () => {
    const { accessToken, fetchFn } = setup();

    await expect(accessToken()).resolves.toBe('access-1');

    expect(fetchFn).toHaveBeenCalledWith(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: expect.any(String),
    });
    expect(sentForm(fetchFn)).toEqual({
      client_id: 'client-1',
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
      scope: 'https://ads.microsoft.com/msads.manage offline_access',
    });
  });

  it('sends the client secret of a web app registration', async () => {
    const { accessToken, fetchFn } = setup({ clientSecret: 'secret-1' });

    await accessToken();

    expect(sentForm(fetchFn)).toMatchObject({ client_secret: 'secret-1' });
  });

  it('reuses the access token until shortly before it expires', async () => {
    const { accessToken, fetchFn, clock } = setup({
      responses: [tokenResponse('access-1', 'refresh-2'), tokenResponse('access-2')],
    });

    await accessToken();
    clock.now += (3600 - 61) * 1000;
    await expect(accessToken()).resolves.toBe('access-1');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    clock.now += 1000;
    await expect(accessToken()).resolves.toBe('access-2');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('refreshes with the newest refresh token Microsoft handed back', async () => {
    const { accessToken, fetchFn, clock } = setup({
      responses: [tokenResponse('access-1', 'refresh-2'), tokenResponse('access-2')],
    });

    await accessToken();
    clock.now += 3600 * 1000;
    await accessToken();

    expect(sentForm(fetchFn, 1)).toMatchObject({ refresh_token: 'refresh-2' });
  });

  it('keeps the refresh token it has when Microsoft hands back none', async () => {
    const { accessToken, fetchFn, clock } = setup({
      responses: [tokenResponse('access-1'), tokenResponse('access-2')],
    });

    await accessToken();
    clock.now += 3600 * 1000;
    await accessToken();

    expect(sentForm(fetchFn, 1)).toMatchObject({ refresh_token: 'refresh-1' });
  });

  it('fails when Microsoft answers without an access token', async () => {
    const { accessToken } = setup({ responses: [new Response('{"token_type":"Bearer"}')] });

    await expect(accessToken()).rejects.toThrow('Microsoft token refresh returned no token');
  });

  it('ignores a refresh token that is not text', async () => {
    const { accessToken, fetchFn, clock } = setup({
      responses: [
        new Response(
          JSON.stringify({ access_token: 'access-1', expires_in: 3600, refresh_token: 42 }),
        ),
        tokenResponse('access-2'),
      ],
    });

    await accessToken();
    clock.now += 3600 * 1000;
    await accessToken();

    expect(sentForm(fetchFn, 1)).toMatchObject({ refresh_token: 'refresh-1' });
  });

  it('fails with Microsoft’s explanation when the refresh token is refused', async () => {
    const { accessToken } = setup({
      responses: [new Response('{"error":"invalid_grant"}', { status: 400 })],
    });

    await expect(accessToken()).rejects.toThrow(
      'Microsoft token refresh failed — HTTP 400: {"error":"invalid_grant"}',
    );
  });
});
