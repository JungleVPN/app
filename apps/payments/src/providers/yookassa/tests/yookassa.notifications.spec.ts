import 'reflect-metadata';
import * as process from 'node:process';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { BotNotificationService } from '@payments/notifications/bot-notification.service';
import { EmailNotificationService } from '@payments/notifications/email-notification.service';
import type { PaymentStatusService } from '@payments/payment-status/payment-status.service';
import type { PromoService } from '@payments/promo/promo.service';
import { AutopaymentService } from '@payments/providers/yookassa/autopayment/autopayment.service';
import type { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import type { ToltService } from '@payments/tolt/tolt.service';
import type { PaymentsUtils } from '@payments/utils/utils';
import type { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import type { RemnawebhookPayload } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Notifications reaching the customer, driven from real YooKassa outcomes.
 *
 * The payment services never call the bot or the mailer directly — they emit
 * events, and the two notification services listen. Unit-testing either half
 * alone cannot catch a renamed event, so this wires the real listeners to a
 * real EventEmitter2 and drives them from actual webhooks and autopayment
 * results, asserting on the HTTP calls that reach Telegram and Zoho.
 */

vi.mock('@workspace/database', () => ({
  YookassaPayment: class {},
  TelegramStarsPayment: class {},
  StripePayment: class {},
  SavedPaymentMethod: class {},
  Promo: class {},
  PromoRedemption: class {},
  ToltReferral: class {},
  ToltTransaction: class {},
  FxRate: class {},
}));

const { mockAxiosGet, mockAxiosPost } = vi.hoisted(() => ({
  mockAxiosGet: vi.fn(),
  mockAxiosPost: vi.fn(),
}));

vi.mock('axios', () => {
  const isAxiosError = (err: any) => Boolean(err?.isAxiosError);
  return {
    default: { get: mockAxiosGet, post: mockAxiosPost, isAxiosError },
    isAxiosError,
  };
});

const EVENT_LISTENER_METADATA = 'EVENT_LISTENER_METADATA';

/**
 * Subscribe a service's `@OnEvent` methods to the emitter, the way Nest's own
 * subscriber loader does at bootstrap. Returned promises are collected so the
 * test can wait for handlers that `emit` fires without awaiting.
 */
const wireListeners = (emitter: EventEmitter2, service: object, inflight: Promise<unknown>[]) => {
  const prototype = Object.getPrototypeOf(service);
  for (const key of Object.getOwnPropertyNames(prototype)) {
    const method = (prototype as any)[key];
    if (typeof method !== 'function') continue;
    const listeners: { event: string }[] =
      Reflect.getMetadata(EVENT_LISTENER_METADATA, method) ?? [];
    for (const { event } of listeners) {
      emitter.on(event, (...args: unknown[]) => {
        inflight.push(Promise.resolve(method.apply(service, args)).catch(() => undefined));
      });
    }
  }
};

// ── Fixtures ─────────────────────────────────────────────────────────────────

const remnawaveUser = {
  uuid: 'user-1',
  username: 'jungle-user',
  telegramId: 42,
  email: 'user@example.test',
  expireAt: '2026-04-01T00:00:00Z',
  status: 'ACTIVE',
};

const succeededWebhook = (overrides: Record<string, unknown> = {}): any => ({
  type: 'notification',
  event: 'payment.succeeded',
  object: {
    id: 'pay_1',
    status: 'succeeded',
    paid: true,
    amount: { value: '599.00', currency: 'RUB' },
    captured_at: '2026-03-01T12:00:00Z',
    ...overrides,
  },
});

const canceledWebhook = (reason = 'insufficient_funds'): any => ({
  type: 'notification',
  event: 'payment.canceled',
  object: {
    id: 'pay_1',
    status: 'canceled',
    cancellation_details: { reason, party: 'payment_network' },
  },
});

const remnaPayload = (dataOverrides: Record<string, unknown> = {}): RemnawebhookPayload =>
  ({
    scope: 'user',
    event: 'user.expire',
    data: { ...remnawaveUser, ...dataOverrides },
    timestamp: new Date(),
    meta: { expiration: -24 },
  }) as unknown as RemnawebhookPayload;

/** Bot notifications posted to the bot's /notify/payment endpoint. */
const botNotifications = () =>
  mockAxiosPost.mock.calls
    .filter(([url]) => String(url).includes('/notify/payment'))
    .map(([, body]) => body);

/** Emails handed to Zoho for delivery. */
const sentEmails = () =>
  mockAxiosPost.mock.calls
    .filter(([url]) => String(url).includes('/messages'))
    .map(([, body]) => body);

describe('YooKassa payment notifications', () => {
  let emitter: EventEmitter2;
  let inflight: Promise<unknown>[];

  let yookassaService: YookassaService;
  let autopaymentService: AutopaymentService;

  let mockYkFindOneBy: ReturnType<typeof vi.fn>;
  let mockYkFindOne: ReturnType<typeof vi.fn>;
  let mockYkCount: ReturnType<typeof vi.fn>;
  let mockSmFindOneBy: ReturnType<typeof vi.fn>;
  let mockProviderCreate: ReturnType<typeof vi.fn>;
  let mockGetPayment: ReturnType<typeof vi.fn>;

  /** Wait for every listener the last emit kicked off. */
  const settle = async () => {
    await Promise.all(inflight);
    inflight.length = 0;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS = JSON.stringify(['127.0.0.1/32']);
    process.env.BOT_URL = 'http://bot:7080/bot';
    process.env.BOT_NOTIFY_SECRET = 'bot-secret';
    process.env.REMNAWAVE_URL = 'http://remnawave:3002/remnawave';
    process.env.INTER_SERVICE_SECRET = 'inter-secret';
    process.env.PAYMENT_DESCRIPTION = 'Jungle VPN';
    // Without Zoho credentials the mailer short-circuits and sends nothing.
    process.env.ZOHO_CLIENT_ID = 'zc';
    process.env.ZOHO_CLIENT_SECRET = 'zs';
    process.env.ZOHO_REFRESH_TOKEN = 'zr';
    process.env.ZOHO_ACCOUNT_ID = 'za';

    mockAxiosGet.mockImplementation(async (url: string) => {
      if (url.includes('/metadata')) return { data: { lang: 'en' } };
      return { data: remnawaveUser };
    });
    mockAxiosPost.mockImplementation(async (url: string) => {
      if (url.includes('/oauth/v2/token')) {
        return { data: { access_token: 'tok', expires_in: 3600 } };
      }
      return { data: { ok: true } };
    });

    emitter = new EventEmitter2();
    inflight = [];
    wireListeners(emitter, new BotNotificationService(), inflight);
    wireListeners(emitter, new EmailNotificationService(), inflight);

    mockYkFindOneBy = vi.fn().mockResolvedValue({
      id: 'pay_1',
      userId: 'user-1',
      selectedPeriod: 1,
      amount: '599.00',
      purpose: 'subscription',
      status: 'pending',
      paidAt: null,
    });
    mockYkFindOne = vi.fn().mockResolvedValue({ selectedPeriod: 1, amount: '599.00' });
    mockYkCount = vi.fn().mockResolvedValue(1);

    const yookassaPaymentRepo = {
      findOneBy: mockYkFindOneBy,
      findOne: mockYkFindOne,
      count: mockYkCount,
      update: vi.fn(),
      create: vi.fn((data: any) => data),
      save: vi.fn(async (v: any) => v),
      find: vi.fn().mockResolvedValue([]),
    } as unknown as Repository<YookassaPayment>;

    mockSmFindOneBy = vi.fn().mockResolvedValue(null);
    const savedMethodRepo = {
      findOneBy: mockSmFindOneBy,
      create: vi.fn((data: any) => data),
      save: vi.fn(async (v: any) => v),
      update: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    } as unknown as Repository<SavedPaymentMethod>;

    mockGetPayment = vi.fn().mockResolvedValue({ status: 'succeeded' });
    mockProviderCreate = vi.fn();
    const provider = {
      getPayment: mockGetPayment,
      create: mockProviderCreate,
    } as unknown as YooKassaProvider;

    const analyticsClient = {
      track: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsClientService;

    yookassaService = new YookassaService(
      provider,
      yookassaPaymentRepo,
      savedMethodRepo,
      {
        handleUserUpdates: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as PaymentStatusService,
      emitter,
      { getExtraDevicePriceRUB: vi.fn(() => '150') } as unknown as PaymentsUtils,
      { resolve: vi.fn() } as unknown as PromoService,
      analyticsClient,
      {
        reportConversion: vi.fn().mockResolvedValue(undefined),
        reportRefund: vi.fn().mockResolvedValue(undefined),
      } as unknown as ToltService,
    );

    autopaymentService = new AutopaymentService(
      savedMethodRepo,
      yookassaPaymentRepo,
      provider,
      emitter,
      analyticsClient,
    );
    // Keep the retry backoff out of the test's wall clock.
    vi.spyOn(autopaymentService as any, 'delay').mockResolvedValue(undefined);
  });

  afterEach(() => {
    for (const key of [
      'YOOKASSA_PAYMENT_VALID_IP_ADDRESS',
      'BOT_URL',
      'BOT_NOTIFY_SECRET',
      'REMNAWAVE_URL',
      'INTER_SERVICE_SECRET',
      'PAYMENT_DESCRIPTION',
      'ZOHO_CLIENT_ID',
      'ZOHO_CLIENT_SECRET',
      'ZOHO_REFRESH_TOKEN',
      'ZOHO_ACCOUNT_ID',
    ]) {
      delete process.env[key];
    }
  });

  // ── Successful payment ─────────────────────────────────────────────────────

  describe('when a payment succeeds', () => {
    it('tells the bot to congratulate the paying user', async () => {
      await yookassaService.handleWebhook(succeededWebhook(), '127.0.0.1');
      await settle();

      expect(botNotifications()).toEqual([
        {
          eventType: 'payment.succeeded',
          payload: {
            userId: 'user-1',
            provider: 'yookassa',
            selectedPeriod: 1,
            purpose: 'subscription',
            isFirstPayment: false,
          },
          user: remnawaveUser,
        },
      ]);
    });

    it('authenticates the bot call with the shared secret', async () => {
      await yookassaService.handleWebhook(succeededWebhook(), '127.0.0.1');
      await settle();

      const call = mockAxiosPost.mock.calls.find(([url]) =>
        String(url).includes('/notify/payment'),
      );
      expect(call?.[0]).toBe('http://bot:7080/bot/notify/payment');
      expect(call?.[2]).toMatchObject({ headers: { 'x-bot-secret': 'bot-secret' } });
    });

    it('flags a first payment so the bot can send an onboarding message', async () => {
      mockYkCount.mockResolvedValue(0);

      await yookassaService.handleWebhook(succeededWebhook(), '127.0.0.1');
      await settle();

      expect(botNotifications()[0].payload).toMatchObject({ isFirstPayment: true });
    });

    // A successful charge is good news the user already sees in Telegram;
    // nothing is mailed, so a new success email would be a deliberate change.
    it('sends no email — success is a bot-only notification', async () => {
      await yookassaService.handleWebhook(succeededWebhook(), '127.0.0.1');
      await settle();

      expect(sentEmails()).toEqual([]);
    });

    // The user has no Telegram account to message; the flow must not blow up.
    it('skips the bot call for a user with no telegram id', async () => {
      mockAxiosGet.mockImplementation(async (url: string) => {
        if (url.includes('/metadata')) return { data: { lang: 'en' } };
        return { data: { ...remnawaveUser, telegramId: null } };
      });

      await yookassaService.handleWebhook(succeededWebhook(), '127.0.0.1');
      await settle();

      expect(botNotifications()).toEqual([]);
    });

    // Notification is a side effect of a payment that has already settled;
    // a bot outage must never surface as a failed webhook.
    it('completes the payment even when the bot is unreachable', async () => {
      mockAxiosPost.mockRejectedValue({ isAxiosError: true, message: 'ECONNREFUSED' });

      await expect(
        yookassaService.handleWebhook(succeededWebhook(), '127.0.0.1'),
      ).resolves.toBeUndefined();
      await settle();
    });

    it('completes the payment even when the user cannot be loaded', async () => {
      mockAxiosGet.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });

      await expect(
        yookassaService.handleWebhook(succeededWebhook(), '127.0.0.1'),
      ).resolves.toBeUndefined();
      await settle();

      expect(botNotifications()).toEqual([]);
    });
  });

  // ── Failed one-off payment ─────────────────────────────────────────────────

  describe('when a payment is canceled', () => {
    it('tells the bot why the renewal failed', async () => {
      mockGetPayment.mockResolvedValue({ status: 'canceled' });

      await yookassaService.handleWebhook(canceledWebhook(), '127.0.0.1');
      await settle();

      expect(botNotifications()).toEqual([
        {
          eventType: 'payment.canceled',
          payload: {
            userId: 'user-1',
            provider: 'yookassa',
            selectedPeriod: 1,
            reason: 'insufficient_funds',
          },
          user: remnawaveUser,
        },
      ]);
    });

    // payment.canceled has no email listener: the user is already told in
    // Telegram, and the autopayment failures below are the ones worth mailing.
    it('sends no email for a canceled one-off payment', async () => {
      mockGetPayment.mockResolvedValue({ status: 'canceled' });

      await yookassaService.handleWebhook(canceledWebhook(), '127.0.0.1');
      await settle();

      expect(sentEmails()).toEqual([]);
    });
  });

  // ── Autopayment failures ───────────────────────────────────────────────────

  describe('when an autopayment cannot be charged', () => {
    beforeEach(() => {
      mockSmFindOneBy.mockResolvedValue({
        userId: 'user-1',
        provider: 'yookassa',
        paymentMethodId: 'pm_1',
        isActive: true,
      });
    });

    it('notifies the bot and emails the user when the card has no funds', async () => {
      mockProviderCreate.mockResolvedValue({
        id: 'pay_x',
        status: 'canceled',
        cancellation_details: { reason: 'insufficient_funds', party: 'payment_network' },
      });

      await autopaymentService.init(remnaPayload());
      await settle();

      expect(botNotifications()).toEqual([
        {
          eventType: 'payment.insufficient_funds',
          payload: { userId: 'user-1', provider: 'yookassa', reason: 'insufficient_funds' },
          user: remnawaveUser,
        },
      ]);
      expect(sentEmails()).toHaveLength(1);
      expect(sentEmails()[0]).toMatchObject({
        toAddress: 'user@example.test',
        fromAddress: 'notification@jungle-vpn.com',
      });
    });

    // A declined card is a bank decision the user must act on themselves, but
    // it carries no email template — Telegram is the only channel.
    it('notifies only the bot when the card is declined', async () => {
      mockProviderCreate.mockResolvedValue({
        id: 'pay_x',
        status: 'canceled',
        cancellation_details: { reason: 'general_decline', party: 'payment_network' },
      });

      await autopaymentService.init(remnaPayload());
      await settle();

      expect(botNotifications().map((n) => n.eventType)).toEqual(['payment.general_decline']);
      expect(sentEmails()).toEqual([]);
    });

    it('notifies only the bot when every retry is exhausted', async () => {
      mockProviderCreate.mockResolvedValue({
        id: 'pay_x',
        status: 'canceled',
        cancellation_details: { reason: 'payment_method_restricted', party: 'payment_network' },
      });

      await autopaymentService.init(remnaPayload());
      await settle();

      expect(botNotifications().map((n) => n.eventType)).toEqual(['payment.autopayment_exhausted']);
      expect(sentEmails()).toEqual([]);
    });

    it('sends nothing at all when the charge succeeds', async () => {
      mockProviderCreate.mockResolvedValue({
        id: 'pay_ok',
        status: 'succeeded',
        amount: { value: '599.00', currency: 'RUB' },
      });

      await autopaymentService.init(remnaPayload());
      await settle();

      expect(botNotifications()).toEqual([]);
      expect(sentEmails()).toEqual([]);
    });
  });

  // ── No method to charge ────────────────────────────────────────────────────

  describe('when the user has no method to charge', () => {
    beforeEach(() => {
      mockSmFindOneBy.mockResolvedValue(null);
    });

    it('notifies the bot that there is nothing to charge', async () => {
      await autopaymentService.init(remnaPayload());
      await settle();

      expect(botNotifications()).toEqual([
        {
          eventType: 'payment.no_active_method',
          payload: { userId: 'user-1', provider: 'yookassa', reason: 'no_active_method' },
          user: remnawaveUser,
        },
      ]);
    });

    // Only the mailer's `payment.no_active_method` listener should fire —
    // sending the 24h expiry countdown on top would double-email the user.
    it('sends only the no-method notice, not the 24 hour expiry countdown', async () => {
      await autopaymentService.init(remnaPayload());
      await settle();

      const subjects = sentEmails().map((email) => email.subject);
      expect(subjects).toHaveLength(1);
      expect(sentEmails().every((email) => email.toAddress === 'user@example.test')).toBe(true);
    });

    // Locale comes from the user's remnawave metadata, so a Russian-speaking
    // customer is not mailed in English.
    it('writes the email in the language the user has chosen', async () => {
      const subjectsFor = async (lang: string) => {
        mockAxiosPost.mockClear();
        mockAxiosGet.mockImplementation(async (url: string) => {
          if (url.includes('/metadata')) return { data: { lang } };
          return { data: remnawaveUser };
        });

        await autopaymentService.init(remnaPayload());
        await settle();
        return sentEmails().map((email) => email.subject);
      };

      const english = await subjectsFor('en');
      const russian = await subjectsFor('ru');

      expect(english).toHaveLength(1);
      expect(russian).toHaveLength(1);
      expect(russian).not.toEqual(english);
      expect(english.join(' ')).toMatch(/[a-z]/i);
      expect(russian.join(' ')).toMatch(/[а-яё]/i);
    });

    // An unrecognised or missing locale falls back to English rather than
    // failing to render.
    it('falls back to English when the panel reports no usable locale', async () => {
      mockAxiosGet.mockImplementation(async (url: string) => {
        if (url.includes('/metadata')) return { data: { lang: 'de' } };
        return { data: remnawaveUser };
      });

      await autopaymentService.init(remnaPayload());
      await settle();

      expect(
        sentEmails()
          .map((email) => email.subject)
          .join(' '),
      ).not.toMatch(/[а-яё]/i);
    });

    // Nothing to send to, so the mail step is skipped rather than failing.
    // The address is read from the event payload for the expiry countdown and
    // from the panel for the no-method notice, so both sources must be empty.
    it('sends no email to a user with no address on file', async () => {
      mockAxiosGet.mockImplementation(async (url: string) => {
        if (url.includes('/metadata')) return { data: { lang: 'en' } };
        return { data: { ...remnawaveUser, email: null } };
      });

      await autopaymentService.init(remnaPayload({ email: null }));
      await settle();

      expect(sentEmails()).toEqual([]);
      expect(botNotifications()).toHaveLength(1);
    });

    // Mail is a best-effort channel; the Telegram notification is what the user
    // will actually see, and it must survive a mail provider outage.
    it('still notifies the bot when the mailer is down', async () => {
      mockAxiosPost.mockImplementation(async (url: string) => {
        if (url.includes('/oauth/v2/token')) throw new Error('zoho unavailable');
        return { data: { ok: true } };
      });

      await expect(autopaymentService.init(remnaPayload())).resolves.toBeUndefined();
      await settle();

      expect(botNotifications()).toHaveLength(1);
      expect(sentEmails()).toEqual([]);
    });
  });
});
