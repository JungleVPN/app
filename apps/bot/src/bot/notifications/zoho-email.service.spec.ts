import 'reflect-metadata';
import * as process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZohoEmailService } from './zoho-email.service';

const mockAxiosPost = vi.fn();
const isAxiosError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as any).isAxiosError === true;

vi.mock('axios', () => ({
  default: {
    post: (...args: unknown[]) => mockAxiosPost(...args),
  },
  isAxiosError: (err: unknown) => isAxiosError(err),
}));

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

const mockSuccessfulSend = () => {
  mockAxiosPost.mockImplementation((url: string) => {
    if (url.includes('accounts.zoho.eu')) {
      return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
    }
    return Promise.resolve({ data: { status: { code: 200 } } });
  });
};

describe('ZohoEmailService', () => {
  let service: ZohoEmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] = value;
    }
    service = new ZohoEmailService();
  });

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it('reports credentials as missing when any Zoho env var is absent', () => {
    delete process.env.ZOHO_CLIENT_ID;

    expect(service.hasCredentials).toBe(false);
  });

  it('reports credentials as configured when all Zoho env vars are present', () => {
    expect(service.hasCredentials).toBe(true);
  });

  it('fetches an access token and sends via the Zoho Mail API', async () => {
    mockSuccessfulSend();

    await service.sendEmail('user@example.com', 'Subject', '<p>hi</p>');

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
      expect.objectContaining({ toAddress: 'user@example.com', subject: 'Subject' }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Zoho-oauthtoken token-1' }),
      }),
    );
  });

  it('reuses the cached access token within its TTL', async () => {
    mockSuccessfulSend();

    await service.sendEmail('user@example.com', 'Subject 1', '<p>hi</p>');
    await service.sendEmail('user@example.com', 'Subject 2', '<p>hi</p>');

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
        return Promise.resolve({
          data: { access_token: `token-${tokenFetches}`, expires_in: 3600 },
        });
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

    await expect(
      service.sendEmail('user@example.com', 'Subject', '<p>hi</p>'),
    ).resolves.toBeUndefined();

    const tokenCalls = mockAxiosPost.mock.calls.filter((call) =>
      String(call[0]).includes('accounts.zoho.eu'),
    );
    expect(tokenCalls).toHaveLength(2);
  });

  it('throws on a non-401 send failure so callers can log and swallow it', async () => {
    mockAxiosPost.mockImplementation((url: string) => {
      if (url.includes('accounts.zoho.eu')) {
        return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
      }
      return Promise.reject(makeAxiosError(500, { data: { errorCode: 'INTERNAL_ERROR' } }));
    });

    await expect(service.sendEmail('user@example.com', 'Subject', '<p>hi</p>')).rejects.toThrow();
  });

  it('describes a Zoho error including the response error code', () => {
    const err = makeAxiosError(500, { data: { errorCode: 'INTERNAL_ERROR' } });

    expect(service.describeError(err)).toContain('INTERNAL_ERROR');
  });
});
