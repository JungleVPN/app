import 'reflect-metadata';
import * as process from 'node:process';
import type { RemnawebhookPayload } from '@workspace/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailNotificationService } from './email-notification.service';

const mockAxiosPost = vi.fn();
const mockAxiosGet = vi.fn();
const isAxiosError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as any).isAxiosError === true;

vi.mock('axios', () => ({
  default: {
    post: (...args: unknown[]) => mockAxiosPost(...args),
    get: (...args: unknown[]) => mockAxiosGet(...args),
  },
  isAxiosError: (err: unknown) => isAxiosError(err),
}));

type UserData = RemnawebhookPayload['data'];

const makeUser = (overrides: Partial<UserData> = {}): UserData =>
  ({
    uuid: 'user-1',
    username: 'test',
    status: 'ACTIVE',
    email: 'user@example.com',
    expireAt: new Date('2026-01-01T00:00:00.000Z'),
    telegramId: null,
    ...overrides,
  }) as unknown as UserData;

const makeAxiosError = (status: number, data: unknown = {}) => {
  const err = new Error('Request failed');
  (err as any).isAxiosError = true;
  (err as any).response = { status, data };
  return err;
};

const REQUIRED_ENV = {
  ZOHO_CLIENT_ID: 'client-id',
  ZOHO_CLIENT_SECRET: 'client-secret',
  ZOHO_REFRESH_TOKEN: 'refresh-token',
  ZOHO_ACCOUNT_ID: 'account-1',
};

describe('EmailNotificationService', () => {
  let service: InstanceType<typeof EmailNotificationService>;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] = value;
    }
    // resolveLocale hits remnawave; default it to a rejected/empty response so DEFAULT_LOCALE is used.
    mockAxiosGet.mockRejectedValue(new Error('not found'));
    service = new EmailNotificationService();
  });

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it('skips sending when Zoho credentials are not configured', async () => {
    delete process.env.ZOHO_CLIENT_ID;

    await service.notifyExpiry(makeUser(), 24);

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('skips sending when the user has no email', async () => {
    await service.notifyExpiry(makeUser({ email: undefined }), 24);

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('fetches an access token and sends via the Zoho Mail API on the default (.eu) domain', async () => {
    mockAxiosPost.mockImplementation((url: string) => {
      if (url.includes('accounts.zoho.eu')) {
        return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
      }
      return Promise.resolve({ data: { status: { code: 200 } } });
    });

    await service.notifyExpiry(makeUser(), 24);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://accounts.zoho.eu/oauth/v2/token',
      null,
      expect.objectContaining({
        params: expect.objectContaining({
          refresh_token: 'refresh-token',
          client_id: 'client-id',
          client_secret: 'client-secret',
          grant_type: 'refresh_token',
        }),
      }),
    );

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://mail.zoho.eu/api/accounts/account-1/messages',
      expect.objectContaining({
        toAddress: 'user@example.com',
        fromAddress: 'notification@jungle-vpn.com',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Zoho-oauthtoken token-1' }),
      }),
    );
  });

  it('uses a different Zoho data-center domain when ZOHO_API_DOMAIN is set', async () => {
    process.env.ZOHO_API_DOMAIN = 'zoho.com';
    mockAxiosPost.mockImplementation((url: string) => {
      if (url.includes('accounts.zoho.com')) {
        return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
      }
      return Promise.resolve({ data: { status: { code: 200 } } });
    });

    await service.notifyExpiry(makeUser(), 24);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://accounts.zoho.com/oauth/v2/token',
      null,
      expect.anything(),
    );
    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://mail.zoho.com/api/accounts/account-1/messages',
      expect.anything(),
      expect.anything(),
    );

    delete process.env.ZOHO_API_DOMAIN;
  });

  it('reuses the cached access token within its TTL', async () => {
    mockAxiosPost.mockImplementation((url: string) => {
      if (url.includes('accounts.zoho.eu')) {
        return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
      }
      return Promise.resolve({ data: { status: { code: 200 } } });
    });

    await service.notifyExpiry(makeUser(), 24);
    await service.notifyExpiry(makeUser(), 48);

    const tokenCalls = mockAxiosPost.mock.calls.filter((call) =>
      String(call[0]).includes('accounts.zoho.eu'),
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it('refetches the token once and retries after a 401, then succeeds', async () => {
    let tokenFetches = 0;
    mockAxiosPost.mockImplementation((url: string) => {
      if (url.includes('accounts.zoho.eu')) {
        tokenFetches += 1;
        return Promise.resolve({ data: { access_token: `token-${tokenFetches}`, expires_in: 3600 } });
      }
      if (url.includes('mail.zoho.eu')) {
        const sendCalls = mockAxiosPost.mock.calls.filter((call) =>
          String(call[0]).includes('mail.zoho.eu'),
        ).length;
        if (sendCalls === 1) {
          return Promise.reject(makeAxiosError(401, { status: { description: 'Unauthorized' } }));
        }
        return Promise.resolve({ data: { status: { code: 200 } } });
      }
      return Promise.reject(new Error('unexpected url'));
    });

    await expect(service.notifyExpiry(makeUser(), 24)).resolves.toBeUndefined();

    const tokenCalls = mockAxiosPost.mock.calls.filter((call) =>
      String(call[0]).includes('accounts.zoho.eu'),
    );
    const sendCalls = mockAxiosPost.mock.calls.filter((call) =>
      String(call[0]).includes('mail.zoho.eu'),
    );
    expect(tokenCalls).toHaveLength(2);
    expect(sendCalls).toHaveLength(2);
  });

  it('logs and swallows a non-401 send failure without throwing', async () => {
    mockAxiosPost.mockImplementation((url: string) => {
      if (url.includes('accounts.zoho.eu')) {
        return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
      }
      return Promise.reject(makeAxiosError(500, { data: { errorCode: 'INTERNAL_ERROR' } }));
    });

    await expect(service.notifyExpiry(makeUser(), 24)).resolves.toBeUndefined();
  });

  it('logs and swallows a second 401 after the retry without throwing', async () => {
    mockAxiosPost.mockImplementation((url: string) => {
      if (url.includes('accounts.zoho.eu')) {
        return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
      }
      return Promise.reject(makeAxiosError(401, { status: { description: 'Unauthorized' } }));
    });

    await expect(service.notifyExpiry(makeUser(), 24)).resolves.toBeUndefined();

    const sendCalls = mockAxiosPost.mock.calls.filter((call) =>
      String(call[0]).includes('mail.zoho.eu'),
    );
    expect(sendCalls).toHaveLength(2);
  });
});
