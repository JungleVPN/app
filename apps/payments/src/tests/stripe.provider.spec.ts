import 'reflect-metadata';
import * as process from 'node:process';
import { BadRequestException } from '@nestjs/common';
import type { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import { CreateStripeSessionDto } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
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

/**
 * The customer lookup is the one mock the harness calls itself rather than
 * handing straight to the SDK, so it carries a real signature.
 */
type CustomersListMock = Mock<
  (params: { email: string; limit: number }) => Promise<{
    data: { id: string; metadata?: Record<string, string> }[];
  }>
>;

const makeProvider = (overrides: {
  mockCreateSession?: ReturnType<typeof vi.fn>;
  mockTrack?: ReturnType<typeof vi.fn>;
  mockRepoFindOne?: ReturnType<typeof vi.fn>;
  mockRepoExists?: ReturnType<typeof vi.fn>;
  mockRepoCreate?: ReturnType<typeof vi.fn>;
  mockRepoSave?: ReturnType<typeof vi.fn>;
  mockSubscriptionsList?: ReturnType<typeof vi.fn>;
  mockCustomersCreate?: ReturnType<typeof vi.fn>;
  mockCustomersList?: CustomersListMock;
  mockCustomersUpdate?: ReturnType<typeof vi.fn>;
  mockPortalCreate?: ReturnType<typeof vi.fn>;
}) => {
  const mockCreateSession =
    overrides.mockCreateSession ??
    vi.fn().mockResolvedValue({
      object: 'checkout.session',
      id: 'cs_1',
      url: 'https://stripe.test',
      customer: 'cus_1',
    });
  const mockTrack = overrides.mockTrack ?? vi.fn().mockResolvedValue(undefined);
  const mockRepoFindOne = overrides.mockRepoFindOne ?? vi.fn().mockResolvedValue(null);
  const mockRepoExists = overrides.mockRepoExists ?? vi.fn().mockResolvedValue(false);
  const mockSubscriptionsList =
    overrides.mockSubscriptionsList ?? vi.fn().mockResolvedValue({ data: [] });
  const mockCustomersCreate =
    overrides.mockCustomersCreate ?? vi.fn().mockResolvedValue({ id: 'cus_1' });
  const mockCustomersList: CustomersListMock =
    overrides.mockCustomersList ?? vi.fn(async () => ({ data: [] }));
  const mockCustomersUpdate = overrides.mockCustomersUpdate ?? vi.fn().mockResolvedValue({});
  const mockPortalCreate =
    overrides.mockPortalCreate ??
    vi.fn().mockResolvedValue({
      object: 'billing_portal.session',
      id: 'bps_1',
      url: 'https://portal.test',
    });

  // Stands in for StripeClientService, but resolves its lookups through the same
  // SDK mock the rest of this harness asserts on, so the by-email path is
  // exercised rather than stubbed away.
  const stripeClient = {
    stripe: {
      checkout: { sessions: { create: mockCreateSession } },
      customers: {
        create: mockCustomersCreate,
        list: mockCustomersList,
        update: mockCustomersUpdate,
      },
      billingPortal: { sessions: { create: mockPortalCreate } },
      subscriptions: { list: mockSubscriptionsList },
    },
    findCustomerByEmail: async (email: string) =>
      (await mockCustomersList({ email, limit: 1 })).data[0] ?? null,
    findCustomerIdByEmail: async (email: string) =>
      (await mockCustomersList({ email, limit: 1 })).data[0]?.id ?? null,
  } as unknown as StripeClientService;

  const mockRepoCreate = overrides.mockRepoCreate ?? vi.fn((entity: unknown) => entity);
  const mockRepoSave = overrides.mockRepoSave ?? vi.fn(async (entity: unknown) => entity);

  const stripeRepo = {
    findOne: mockRepoFindOne,
    exists: mockRepoExists,
    create: mockRepoCreate,
    save: mockRepoSave,
    update: vi.fn().mockResolvedValue({}),
  } as unknown as Repository<StripePayment>;

  const yookassaRepo = {
    exists: vi.fn().mockResolvedValue(false),
  } as unknown as Repository<YookassaPayment>;
  const starsRepo = {
    exists: vi.fn().mockResolvedValue(false),
  } as unknown as Repository<TelegramStarsPayment>;

  const provider = new StripeProvider(
    {} as unknown as StripeWebhookService,
    stripeClient,
    stripeRepo,
    yookassaRepo,
    starsRepo,
    { track: mockTrack } as never,
  );

  return {
    provider,
    mockCreateSession,
    mockTrack,
    mockRepoFindOne,
    mockRepoExists,
    mockRepoCreate,
    mockRepoSave,
    mockPortalCreate,
    mockCustomersCreate,
    mockCustomersList,
    mockCustomersUpdate,
  };
};

const subscriptionDto = (
  overrides: Partial<CreateStripeSessionDto> = {},
): CreateStripeSessionDto => ({
  userId: 1000,
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

  describe('return URL', () => {
    beforeEach(() => {
      process.env.CORS_ORIGIN = 'https://jungle-vpn.com,https://jungle.community';
    });

    afterEach(() => {
      delete process.env.CORS_ORIGIN;
      delete process.env.RETURN_URL_WEB;
    });

    it('sends the user back to the domain the payment was started from', async () => {
      const { provider, mockCreateSession } = makeProvider({});

      await provider.createPayment(
        subscriptionDto({ selectedPeriod: 1 }),
        'https://jungle.community',
      );

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://jungle.community/payment/success',
          cancel_url: 'https://jungle.community/payment/fail',
        }),
      );
    });

    it('falls back to RETURN_URL_WEB when the request origin is not one of the app domains', async () => {
      process.env.RETURN_URL_WEB = 'https://fallback.example.com/profile/subscription';
      const { provider, mockCreateSession } = makeProvider({});

      await provider.createPayment(
        subscriptionDto({ selectedPeriod: 1 }),
        'https://evil.example.com',
      );

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://fallback.example.com/profile/subscription',
          cancel_url: 'https://fallback.example.com/profile/subscription',
        }),
      );
    });
  });

  describe('hasActiveSubscription', () => {
    /**
     * Stands in for Stripe's list endpoint: filters by the requested status and
     * returns at most one page, so a listing that relies on page ordering to
     * find the active subscription behaves here as it would in production.
     */
    const stripeListOf = (subscriptions: { status: string }[]) =>
      vi.fn(async ({ status, limit }: { status: string; limit?: number }) => {
        const matching =
          status === 'all' ? subscriptions : subscriptions.filter((s) => s.status === status);
        return { data: matching.slice(0, limit ?? 10) };
      });

    it('finds an active subscription', async () => {
      const { provider } = makeProvider({
        mockSubscriptionsList: stripeListOf([{ status: 'active' }]),
      });

      await expect(provider.hasActiveSubscription('cus_1')).resolves.toBe(true);
    });

    it('finds a trialing subscription', async () => {
      const { provider } = makeProvider({
        mockSubscriptionsList: stripeListOf([{ status: 'trialing' }]),
      });

      await expect(provider.hasActiveSubscription('cus_1')).resolves.toBe(true);
    });

    it('reports none for a customer whose subscriptions have all ended', async () => {
      const { provider } = makeProvider({
        mockSubscriptionsList: stripeListOf([{ status: 'canceled' }, { status: 'incomplete' }]),
      });

      await expect(provider.hasActiveSubscription('cus_1')).resolves.toBe(false);
    });

    it('finds the active subscription of a customer with a long churn history', async () => {
      // Every cancellation leaves a permanent subscription object behind, so a
      // customer who has resubscribed often pushes the live one past the first
      // page of an unfiltered listing.
      const history = [
        ...Array.from({ length: 12 }, () => ({ status: 'canceled' })),
        { status: 'active' },
      ];
      const { provider } = makeProvider({ mockSubscriptionsList: stripeListOf(history) });

      await expect(provider.hasActiveSubscription('cus_1')).resolves.toBe(true);
    });

    it('never pages through a customer’s canceled history to answer', async () => {
      const list = stripeListOf([{ status: 'active' }]);
      const { provider } = makeProvider({ mockSubscriptionsList: list });

      await provider.hasActiveSubscription('cus_1');

      for (const [params] of list.mock.calls) {
        expect(params.status).not.toBe('all');
      }
    });
  });

  // "No subscription" is the unsafe answer to a failed lookup: it is what routes
  // an existing subscriber into a second subscription and bills them twice.
  describe('when the subscription lookup fails', () => {
    beforeEach(() => {
      process.env.ALLOWED_PERIOD = '1,3,6,12';
      process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1 = 'price_month_1';
    });

    it('surfaces the failure instead of reporting no subscription', async () => {
      const { provider } = makeProvider({
        mockSubscriptionsList: vi.fn().mockRejectedValue(new Error('rate limited')),
      });

      await expect(provider.hasActiveSubscription('cus_1')).rejects.toThrow('rate limited');
    });

    it('never opens a second checkout for a customer who may already be subscribed', async () => {
      const { provider, mockCreateSession } = makeProvider({
        mockRepoFindOne: vi.fn().mockResolvedValue({ customer: 'cus_1' }),
        mockSubscriptionsList: vi.fn().mockRejectedValue(new Error('rate limited')),
      });

      await expect(provider.createPayment(subscriptionDto())).rejects.toThrow('rate limited');
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('never tells a payer their subscription does not exist', async () => {
      const { provider } = makeProvider({
        mockRepoFindOne: vi.fn().mockResolvedValue({ customer: 'cus_1' }),
        mockSubscriptionsList: vi.fn().mockRejectedValue(new Error('rate limited')),
      });

      await expect(provider.getSubscriptionStatus(1000)).rejects.toThrow('rate limited');
    });
  });
});

/**
 * The metadata an anonymous checkout assembles — the payer email, the `?ref=`
 * inviter and the signup origin — is what the Stripe webhook reads back off the
 * customer to create the account once the charge settles. It used to be written
 * only when a customer was created, so a payer whose earlier attempt had already
 * minted one had this attempt's referral and origin silently dropped.
 */
describe('StripeProvider.createPayment — anonymous checkout metadata', () => {
  beforeEach(() => {
    process.env.ALLOWED_PERIOD = '1,3,6,12';
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1 = 'price_default';
  });

  afterEach(() => {
    delete process.env.ALLOWED_PERIOD;
    delete process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1;
  });

  const anonymousDto = (
    overrides: Partial<CreateStripeSessionDto> = {},
  ): CreateStripeSessionDto => ({
    userId: null,
    purchaseType: 'subscription',
    selectedPeriod: 1,
    metadata: {
      email: 'payer@example.com',
      inviterId: '42',
      signupOrigin: 'https://jungle-vpn.com',
    },
    ...overrides,
  });

  /** An existing Stripe customer for `payer@example.com`, with the given metadata. */
  const customerOnFile = (metadata: Record<string, string>): CustomersListMock =>
    vi.fn(async () => ({ data: [{ id: 'cus_existing', metadata }] }));

  it('carries the referral onto a customer that was created without one', async () => {
    const { provider, mockCustomersUpdate } = makeProvider({
      mockCustomersList: customerOnFile({ email: 'payer@example.com' }),
    });

    await provider.createPayment(anonymousDto());

    expect(mockCustomersUpdate).toHaveBeenCalledWith('cus_existing', {
      metadata: { inviterId: '42', signupOrigin: 'https://jungle-vpn.com' },
    });
  });

  it('keeps the attribution already on file rather than overwriting it', async () => {
    const { provider, mockCustomersUpdate } = makeProvider({
      mockCustomersList: customerOnFile({
        email: 'payer@example.com',
        inviterId: '7',
        signupOrigin: 'https://jungle-vpn.com',
      }),
    });

    await provider.createPayment(anonymousDto());

    expect(mockCustomersUpdate).not.toHaveBeenCalled();
  });

  // Once the account exists the webhook never reads these keys again, so there
  // is nothing to back-fill and no reason to spend a Stripe write on it.
  it('leaves a customer whose account already exists untouched', async () => {
    const { provider, mockCustomersUpdate } = makeProvider({
      mockCustomersList: customerOnFile({ email: 'payer@example.com', userId: '1000' }),
    });

    await provider.createPayment(anonymousDto());

    expect(mockCustomersUpdate).not.toHaveBeenCalled();
  });

  // Losing the referral is bad; losing the sale is worse.
  it('still opens the checkout when the back-fill fails', async () => {
    const { provider, mockCreateSession } = makeProvider({
      mockCustomersList: customerOnFile({ email: 'payer@example.com' }),
      mockCustomersUpdate: vi.fn().mockRejectedValue(new Error('rate limited')),
    });

    await expect(provider.createPayment(anonymousDto())).resolves.toMatchObject({ id: 'cs_1' });
    expect(mockCreateSession).toHaveBeenCalled();
  });

  // The reason the lookup exists at all: a second customer for the same address
  // is a second subscription billed against a payer who already has one.
  it('bills the customer it found rather than minting a second one', async () => {
    const { provider, mockCreateSession, mockCustomersCreate } = makeProvider({
      mockCustomersList: customerOnFile({ email: 'payer@example.com' }),
    });

    await provider.createPayment(anonymousDto());

    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    );
  });

  // Stripe reads an empty metadata value as "delete this key", so a blank is
  // never something to write — and on its own it is not a reason to write at all.
  it('ignores a blank metadata value rather than writing it', async () => {
    const { provider, mockCustomersUpdate } = makeProvider({
      mockCustomersList: customerOnFile({ email: 'payer@example.com' }),
    });

    await provider.createPayment(
      anonymousDto({ metadata: { email: 'payer@example.com', inviterId: '' } }),
    );

    expect(mockCustomersUpdate).not.toHaveBeenCalled();
  });

  it('writes the metadata itself when there is no customer to reuse', async () => {
    const { provider, mockCustomersCreate, mockCustomersUpdate } = makeProvider({});

    await provider.createPayment(anonymousDto());

    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: 'payer@example.com',
      metadata: {
        email: 'payer@example.com',
        inviterId: '42',
        signupOrigin: 'https://jungle-vpn.com',
      },
    });
    expect(mockCustomersUpdate).not.toHaveBeenCalled();
  });
});

/**
 * A Tolt referral is a new-customer commission, so it may only ride on a payer's
 * first-ever successful payment. An anonymous checkout carries no userId, so the
 * history has to be read off the Stripe customer the email resolved to.
 */
describe('StripeProvider.createPayment — referral attribution', () => {
  beforeEach(() => {
    process.env.ALLOWED_PERIOD = '1,3,6,12';
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1 = 'price_default';
  });

  afterEach(() => {
    delete process.env.ALLOWED_PERIOD;
    delete process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1;
  });

  const referredAnonymousDto = (): CreateStripeSessionDto => ({
    userId: null,
    purchaseType: 'subscription',
    selectedPeriod: 1,
    metadata: { email: 'payer@example.com' },
    toltReferralId: 'tolt_1',
  });

  const customerOnFile = (): CustomersListMock =>
    vi.fn(async () => ({ data: [{ id: 'cus_existing', metadata: {} }] }));

  /** The tolt_referral the session was opened with, or undefined. */
  const referralOnSession = (mockCreateSession: ReturnType<typeof vi.fn>) =>
    mockCreateSession.mock.calls[0][0].metadata.tolt_referral;

  it('drops the referral when the email already has a settled Stripe payment', async () => {
    const mockRepoExists = vi.fn().mockResolvedValue(true);
    const { provider, mockCreateSession } = makeProvider({
      mockCustomersList: customerOnFile(),
      mockRepoExists,
    });

    await provider.createPayment(referredAnonymousDto());

    expect(mockRepoExists).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer: 'cus_existing' }),
      }),
    );
    expect(referralOnSession(mockCreateSession)).toBeNull();
  });

  it('attributes the referral when the customer on file has never paid', async () => {
    const { provider, mockCreateSession } = makeProvider({
      mockCustomersList: customerOnFile(),
      mockRepoExists: vi.fn().mockResolvedValue(false),
    });

    await provider.createPayment(referredAnonymousDto());

    expect(referralOnSession(mockCreateSession)).toBe('tolt_1');
  });

  it('attributes the referral when the email has no Stripe customer at all', async () => {
    const mockRepoExists = vi.fn().mockResolvedValue(false);
    const { provider, mockCreateSession } = makeProvider({ mockRepoExists });

    await provider.createPayment(referredAnonymousDto());

    expect(mockRepoExists).not.toHaveBeenCalled();
    expect(referralOnSession(mockCreateSession)).toBe('tolt_1');
  });
});

/**
 * `openSession` is what the controllers actually call: it prices the request,
 * opens the session, and — only for a real checkout — records the pending sale
 * and the start of the funnel.
 */
describe('StripeProvider.openSession', () => {
  beforeEach(() => {
    process.env.PRICE_EUR_MONTH_1 = '10';
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1 = 'price_1';
  });

  afterEach(() => {
    delete process.env.PRICE_EUR_MONTH_1;
    delete process.env.STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_1;
    delete process.env.EXTRA_DEVICE_PRICE_EUR;
    delete process.env.STRIPE_EXTRA_DEVICE_PRICE_ID;
  });

  it('records the pending sale for a checkout session', async () => {
    const { provider, mockRepoSave } = makeProvider({});

    await provider.openSession(subscriptionDto(), 'https://app.test');

    expect(mockRepoSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cs_1', status: 'pending', amount: 10, paidAt: null }),
    );
  });

  it('records the start of checkout for analytics, tagged with its purpose', async () => {
    const { provider, mockTrack } = makeProvider({});

    await provider.openSession(subscriptionDto({ userId: 42 }), 'https://app.test');

    expect(mockTrack).toHaveBeenCalledWith({
      event: 'checkout_started',
      userId: 42,
      email: 'test@example.com',
      provider: 'stripe',
      purpose: 'subscription',
      amount: '10',
      currency: 'EUR',
    });
  });

  it('tags an extra-device checkout with its purpose', async () => {
    process.env.EXTRA_DEVICE_PRICE_EUR = '5';
    process.env.STRIPE_EXTRA_DEVICE_PRICE_ID = 'price_device';
    const { provider, mockTrack } = makeProvider({});

    await provider.openSession(
      subscriptionDto({ purchaseType: 'extra_device' }),
      'https://app.test',
    );

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'checkout_started', purpose: 'extra_device' }),
    );
  });

  describe('when the subscriber is sent to the billing portal instead', () => {
    // A customer with a live subscription is routed to the portal rather than
    // being sold a second one.
    const portalProvider = () =>
      makeProvider({
        mockRepoFindOne: vi.fn().mockResolvedValue({ customer: 'cus_1' }),
        mockSubscriptionsList: vi.fn().mockResolvedValue({ data: [{ status: 'active' }] }),
      });

    it('records no sale, because opening the portal buys nothing', async () => {
      const { provider, mockRepoSave } = portalProvider();

      await provider.openSession(subscriptionDto(), 'https://app.test');

      expect(mockRepoSave).not.toHaveBeenCalled();
    });

    it('reports no checkout started, because none was', async () => {
      const { provider, mockTrack } = portalProvider();

      await provider.openSession(subscriptionDto(), 'https://app.test');

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('still returns the portal session to the caller', async () => {
      const { provider } = portalProvider();

      const session = await provider.openSession(subscriptionDto(), 'https://app.test');

      expect(session).toMatchObject({ object: 'billing_portal.session' });
    });
  });

  it('rejects an unusable period before reaching Stripe', async () => {
    const { provider, mockCreateSession } = makeProvider({});

    await expect(
      provider.openSession(subscriptionDto({ selectedPeriod: 7 }), 'https://app.test'),
    ).rejects.toThrow(BadRequestException);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
