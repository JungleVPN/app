import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from './client';

const fetchMock = vi.fn();

const respondWith = (status: number, body: unknown = {}) =>
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

describe('createApiClient: rejected credentials', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // In the mini app a 401 means Telegram's launch data is too old to be
  // trusted; only reopening the app issues fresh data, so the app has to know.
  it('tells the app when the backend rejects its credentials', async () => {
    const onUnauthorized = vi.fn();
    respondWith(401, { message: 'Telegram initData has expired' });
    const client = createApiClient({ baseUrl: 'https://api.test', onUnauthorized });

    await expect(client.get('/users/me')).rejects.toBeInstanceOf(ApiClientError);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not treat other failures as rejected credentials', async () => {
    const onUnauthorized = vi.fn();
    respondWith(403);
    const client = createApiClient({ baseUrl: 'https://api.test', onUnauthorized });

    await expect(client.get('/users/me')).rejects.toBeInstanceOf(ApiClientError);

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('still rejects a 401 when the app has nothing to be told', async () => {
    respondWith(401);
    const client = createApiClient({ baseUrl: 'https://api.test' });

    await expect(client.get('/users/me')).rejects.toMatchObject({ status: 401 });
  });
});
