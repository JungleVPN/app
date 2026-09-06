import 'reflect-metadata';
import * as process from 'node:process';
import type { Payments } from '@workspace/types';
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

const remnawaveUser = {
  id: 1000,
  username: 'test',
  status: 'ACTIVE',
  email: 'user@example.com',
  expireAt: new Date('2026-01-01T00:00:00.000Z'),
  telegramId: null,
};

const makeExpiryEvent = (
  overrides: Partial<Payments.PaymentExpiryReminderEventPayload> = {},
): Payments.PaymentExpiryReminderEventPayload => ({
  userId: 1000,
  provider: 'yookassa',
  hoursRemaining: 24,
  remnawavePayload: {} as Payments.PaymentExpiryReminderEventPayload['remnawavePayload'],
  ...overrides,
});

const makePaymentSucceededEvent = (
  overrides: Partial<Payments.PaymentSucceededEventPayload> = {},
): Payments.PaymentSucceededEventPayload => ({
  userId: 1000,
  provider: 'yookassa',
  ...overrides,
});

const mockUserFetch = (userOverrides: Partial<typeof remnawaveUser> = {}) => {
  mockAxiosGet.mockImplementation(async (url: string) => {
    if (url.includes('/metadata')) return { data: {} };
    return { data: { ...remnawaveUser, ...userOverrides } };
  });
};

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

  describe('onExpiryReminder', () => {
    it('skips sending when Zoho credentials are not configured', async () => {
      delete process.env.ZOHO_CLIENT_ID;
      mockUserFetch();

      await service.onExpiryReminder(makeExpiryEvent());

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('skips sending when the user has no email', async () => {
      mockUserFetch({ email: undefined });

      await service.onExpiryReminder(makeExpiryEvent());

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('fetches an access token and sends via the Zoho Mail API on the default (.eu) domain', async () => {
      mockUserFetch();
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.resolve({ data: { status: { code: 200 } } });
      });

      await service.onExpiryReminder(makeExpiryEvent());

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
          fromAddress: '"JungleVPN Subscription" <notification@jungle-vpn.com>',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Zoho-oauthtoken token-1' }),
        }),
      );
    });

    it('uses a custom sender display name when ZOHO_FROM_NAME is set', async () => {
      process.env.ZOHO_FROM_NAME = 'Jungle Support';
      mockUserFetch();
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.resolve({ data: { status: { code: 200 } } });
      });

      await service.onExpiryReminder(makeExpiryEvent());

      expect(mockAxiosPost).toHaveBeenCalledWith(
        'https://mail.zoho.eu/api/accounts/account-1/messages',
        expect.objectContaining({
          fromAddress: '"Jungle Support" <notification@jungle-vpn.com>',
        }),
        expect.anything(),
      );

      delete process.env.ZOHO_FROM_NAME;
    });

    it('uses a different Zoho data-center domain when ZOHO_API_DOMAIN is set', async () => {
      mockUserFetch();
      process.env.ZOHO_API_DOMAIN = 'zoho.com';
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.com')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.resolve({ data: { status: { code: 200 } } });
      });

      await service.onExpiryReminder(makeExpiryEvent());

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
      mockUserFetch();
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.resolve({ data: { status: { code: 200 } } });
      });

      await service.onExpiryReminder(makeExpiryEvent({ hoursRemaining: 24 }));
      await service.onExpiryReminder(makeExpiryEvent({ hoursRemaining: 48 }));

      const tokenCalls = mockAxiosPost.mock.calls.filter((call) =>
        String(call[0]).includes('accounts.zoho.eu'),
      );
      expect(tokenCalls).toHaveLength(1);
    });

    it('refetches the token once and retries after a 401, then succeeds', async () => {
      mockUserFetch();
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

      await expect(service.onExpiryReminder(makeExpiryEvent())).resolves.toBeUndefined();

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
      mockUserFetch();
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.reject(makeAxiosError(500, { data: { errorCode: 'INTERNAL_ERROR' } }));
      });

      await expect(service.onExpiryReminder(makeExpiryEvent())).resolves.toBeUndefined();
    });

    it('logs and swallows a second 401 after the retry without throwing', async () => {
      mockUserFetch();
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.reject(makeAxiosError(401, { status: { description: 'Unauthorized' } }));
      });

      await expect(service.onExpiryReminder(makeExpiryEvent())).resolves.toBeUndefined();

      const sendCalls = mockAxiosPost.mock.calls.filter((call) =>
        String(call[0]).includes('mail.zoho.eu'),
      );
      expect(sendCalls).toHaveLength(2);
    });
  });

  describe('onPaymentSucceeded', () => {
    it('skips sending when Zoho credentials are not configured', async () => {
      delete process.env.ZOHO_CLIENT_ID;
      mockUserFetch();

      await service.onPaymentSucceeded(makePaymentSucceededEvent());

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('skips sending when the user has no email', async () => {
      mockUserFetch({ email: undefined });

      await service.onPaymentSucceeded(makePaymentSucceededEvent());

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('sends a payment success email to the user', async () => {
      mockUserFetch();
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.resolve({ data: { status: { code: 200 } } });
      });

      await service.onPaymentSucceeded(makePaymentSucceededEvent());

      expect(mockAxiosPost).toHaveBeenCalledWith(
        'https://mail.zoho.eu/api/accounts/account-1/messages',
        expect.objectContaining({
          toAddress: 'user@example.com',
          fromAddress: '"JungleVPN Subscription" <notification@jungle-vpn.com>',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Zoho-oauthtoken token-1' }),
        }),
      );
    });

    // Locale comes from the user's remnawave metadata, so a Russian-speaking
    // customer is not mailed in English.
    it('writes the email in the language the user has chosen', async () => {
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.resolve({ data: { status: { code: 200 } } });
      });

      const subjectsFor = async (lang: string) => {
        mockAxiosPost.mockClear();
        mockAxiosGet.mockImplementation(async (url: string) => {
          if (url.includes('/metadata')) return { data: { lang } };
          return { data: remnawaveUser };
        });
        mockAxiosPost.mockImplementation((url: string) => {
          if (url.includes('accounts.zoho.eu')) {
            return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
          }
          return Promise.resolve({ data: { status: { code: 200 } } });
        });

        await service.onPaymentSucceeded(makePaymentSucceededEvent());

        const sendCall = mockAxiosPost.mock.calls.find((call) =>
          String(call[0]).includes('mail.zoho.eu'),
        );
        return sendCall?.[1].subject as string;
      };

      const english = await subjectsFor('en');
      const russian = await subjectsFor('ru');

      expect(english).not.toEqual(russian);
      expect(english).toMatch(/[a-z]/i);
      expect(russian).toMatch(/[а-яё]/i);
    });

    it('logs and swallows a send failure without throwing', async () => {
      mockUserFetch();
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.reject(makeAxiosError(500, { data: { errorCode: 'INTERNAL_ERROR' } }));
      });

      await expect(
        service.onPaymentSucceeded(makePaymentSucceededEvent()),
      ).resolves.toBeUndefined();
    });
  });

  describe('site URL from metadata.lang', () => {
    beforeEach(() => {
      process.env.PUBLIC_DOMAIN_RU = 'ru-jungle.example';
      process.env.PUBLIC_DOMAIN_GLOBAL = 'jungle-vpn.com';
      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('accounts.zoho.eu')) {
          return Promise.resolve({ data: { access_token: 'token-1', expires_in: 3600 } });
        }
        return Promise.resolve({ data: { status: { code: 200 } } });
      });
    });

    afterEach(() => {
      delete process.env.PUBLIC_DOMAIN_RU;
      delete process.env.PUBLIC_DOMAIN_GLOBAL;
    });

    const ctaUrlFor = async (metadata: Record<string, unknown>) => {
      mockAxiosGet.mockImplementation(async (url: string) => {
        // The real endpoint wraps fields as `{ metadata: {...} }`.
        if (url.includes('/metadata')) return { data: { metadata } };
        return { data: remnawaveUser };
      });

      await service.onPaymentSucceeded(makePaymentSucceededEvent());

      const sendCall = mockAxiosPost.mock.calls.find((call) =>
        String(call[0]).includes('mail.zoho.eu'),
      );
      return sendCall?.[1].content as string;
    };

    it('links to the RU domain for a "ru" lang user', async () => {
      const html = await ctaUrlFor({ lang: 'ru' });

      expect(html).toContain('https://ru-jungle.example/profile/subscription');
    });

    it('links to the global domain for an "en" lang user', async () => {
      const html = await ctaUrlFor({ lang: 'en' });

      expect(html).toContain('https://jungle-vpn.com/profile/subscription');
    });

    it('defaults to the global domain when lang metadata is missing', async () => {
      const html = await ctaUrlFor({});

      expect(html).toContain('https://jungle-vpn.com/profile/subscription');
    });

    it('also accepts a flat (unwrapped) metadata response', async () => {
      mockAxiosGet.mockImplementation(async (url: string) => {
        if (url.includes('/metadata')) return { data: { lang: 'ru' } };
        return { data: remnawaveUser };
      });

      await service.onPaymentSucceeded(makePaymentSucceededEvent());

      const sendCall = mockAxiosPost.mock.calls.find((call) =>
        String(call[0]).includes('mail.zoho.eu'),
      );
      expect(sendCall?.[1].content as string).toContain(
        'https://ru-jungle.example/profile/subscription',
      );
    });
  });
});
