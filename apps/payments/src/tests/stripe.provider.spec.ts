import 'reflect-metadata';
import * as process from 'node:process';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import type { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import { CreateStripeSessionDto } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeProvider } from '../providers/stripe/stripe.provider';
import type { StripeClientService } from '../providers/stripe/stripe-client.service';
import type { StripeWebhookService } from '../providers/stripe/stripe-webhook.service';

vi.mock('@workspace/database', () => ({
  StripePayment: class {},
  YookassaPayment: class {},
  TelegramStarsPayment: class {},
  SavedPaymentMethod: class {},
  Promo: class {},
  PromoRedemption: class {},
  ToltReferral: class {},
  ToltTransaction: class {},
  FxRate: class {},
}));

const makeProvider = (overrides: {
  mockCreateSession?: ReturnType<typeof vi.fn>;
  mockTrack?: ReturnType<typeof vi.fn>;
  mockRepoFindOne?: ReturnType<typeof vi.fn>;
  mockRepoExists?: ReturnType<typeof vi.fn>;
  mockSubscriptionsList?: ReturnType<typeof vi.fn>;
  mockCustomersCreate?: ReturnType<typeof vi.fn>;
}) => {
  const mockCreateSession =
    overrides.mockCreateSession ??
    vi.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test', customer: 'cus_1' });
  const mockTrack = overrides.mockTrack ?? vi.fn().mockResolvedValue(undefined);
  const mockRepoFindOne = overrides.mockRepoFindOne ?? vi.fn().mockResolvedValue(null);
  const mockRepoExists = overrides.mockRepoExists ?? vi.fn().mockResolvedValue(false);
  const mockSubscriptionsList =
    overrides.mockSubscriptionsList ?? vi.fn().mockResolvedValue({ data: [] });
  const mockCustomersCreate =
    overrides.mockCustomersCreate ?? vi.fn().mockResolvedValue({ id: 'cus_1' });

  const stripeClient = {
    stripe: {
      checkout: { sessions: { create: mockCreateSession } },
      customers: { create: mockCustomersCreate },
      billingPortal: { sessions: { create: vi.fn() } },
      subscriptions: { list: mockSubscriptionsList },
    },
  } as unknown as StripeClientService;

  const stripeRepo = {
    findOne: mockRepoFindOne,
    exists: mockRepoExists,
  } as unknown as Repository<StripePayment>;

  const yookassaRepo = {
    exists: vi.fn().mockResolvedValue(false),
  } as unknown as Repository<YookassaPayment>;
  const starsRepo = {
    exists: vi.fn().mockResolvedValue(false),
  } as unknown as Repository<TelegramStarsPayment>;

  const analyticsClient = { track: mockTrack } as unknown as AnalyticsClientService;

  const provider = new StripeProvider(
    {} as unknown as StripeWebhookService,
    stripeClient,
    stripeRepo,
    yookassaRepo,
    starsRepo,
    analyticsClient,
  );

  return { provider, mockCreateSession, mockTrack, mockRepoFindOne, mockRepoExists };
};

const subscriptionDto = (
  overrides: Partial<CreateStripeSessionDto> = {},
): CreateStripeSessionDto => ({
  userId: 'user-1',
  purchaseType: 'subscription',
  selectedPeriod: 1,
  metadata: { email: 'test@example.com' },
  ...overrides,
});

describe('StripeProvider.createPayment', () => {
  beforeEach(() => {
    process.env.ALLOWED_PERIOD = '1,3,6,12';
    process.env.PRICE_EUR_MONTH_1 = '6';
    process.env.PRICE_EUR_MONTH_3 = '15';
    process.env.PRICE_EUR_MONTH_6 = '26';
    process.env.PRICE_EUR_MONTH_12 = '43';
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1 = 'price_default';
  });

  afterEach(() => {
    for (const key of [
      'ALLOWED_PERIOD',
      'PRICE_EUR_MONTH_1',
      'PRICE_EUR_MONTH_3',
      'PRICE_EUR_MONTH_6',
      'PRICE_EUR_MONTH_12',
      'STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1',
      'STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1',
      'STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_3',
      'STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_6',
      'STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_12',
    ]) {
      delete process.env[key];
    }
  });

  describe('price ID selection', () => {
    it('uses STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1 when no period-specific price ID is configured', async () => {
      const { provider, mockCreateSession } = makeProvider({});

      await provider.createPayment(subscriptionDto({ selectedPeriod: 1 }));

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ line_items: [{ price: 'price_default', quantity: 1 }] }),
      );
    });

    it('uses STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_3 when selectedPeriod is 3 and it is configured', async () => {
      process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_3 = 'price_3months';
      const { provider, mockCreateSession } = makeProvider({});

      await provider.createPayment(subscriptionDto({ selectedPeriod: 3 }));

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ line_items: [{ price: 'price_3months', quantity: 1 }] }),
      );
    });

    it('uses STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_6 when selectedPeriod is 6 and it is configured', async () => {
      process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_6 = 'price_6months';
      const { provider, mockCreateSession } = makeProvider({});

      await provider.createPayment(subscriptionDto({ selectedPeriod: 6 }));

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ line_items: [{ price: 'price_6months', quantity: 1 }] }),
      );
    });

    it('uses STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_12 when selectedPeriod is 12 and it is configured', async () => {
      process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_12 = 'price_12months';
      const { provider, mockCreateSession } = makeProvider({});

      await provider.createPayment(subscriptionDto({ selectedPeriod: 12 }));

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ line_items: [{ price: 'price_12months', quantity: 1 }] }),
      );
    });

    // Falling back to the monthly price would sell the wrong plan without any
    // signal: the user picks 6 months, Stripe opens a monthly subscription,
    // `mapEURAmountToMonthsNumber` maps the charge back to 1 month, and they
    // end up on a recurring monthly cycle believing they bought half a year.
    // A missing price id is a misconfiguration and has to fail loudly.
    it('refuses to sell a period whose price ID is not configured', async () => {
      process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_3 = 'price_3months';
      const { provider, mockCreateSession } = makeProvider({});

      await expect(provider.createPayment(subscriptionDto({ selectedPeriod: 6 }))).rejects.toThrow(
        /6 month/,
      );
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('defaults to period 1 when selectedPeriod is not provided', async () => {
      process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1 = 'price_1month';
      const { provider, mockCreateSession } = makeProvider({});

      await provider.createPayment(subscriptionDto({ selectedPeriod: undefined }));

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ line_items: [{ price: 'price_1month', quantity: 1 }] }),
      );
    });
  });
});
