import 'reflect-metadata';
import { PlanService } from '@payments/catalog/plan.service';
import { VisitorCurrencyService } from '@payments/catalog/visitor-currency.service';
import type { Plan, PlanProvider } from '@workspace/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommonService } from './common.service';

const ENV_KEYS = ['GLOBAL_PAYMENT_PROVIDER', 'PUBLIC_DOMAIN_RU'] as const;

const RU_ORIGIN = 'https://thejungle.pro';
const GLOBAL_ORIGIN = 'https://jungle-vpn.com';

const plan = (
  provider: PlanProvider,
  billingPeriod: number,
  basePrice: number,
  providerPriceId: string | null = null,
): Plan => ({
  id: `${provider}-${billingPeriod}`,
  type: 'recurring',
  billingPeriod,
  basePrice,
  provider,
  currency: provider === 'yookassa' ? 'RUB' : 'EUR',
  providerPriceId,
  availableForPurchase: true,
  customData: {},
});

const CATALOG: Plan[] = [
  plan('yookassa', 180, 1500),
  plan('yookassa', 30, 500),
  plan('paddle', 30, 6, 'pri_30'),
  plan('paddle', 180, 15, 'pri_180'),
  plan('stripe', 30, 6, 'price_30'),
  plan('stripe', 180, 15, 'price_180'),
];

const planServiceWith = (rows: Plan[]) =>
  new PlanService({
    find: async () => rows,
  } as never);

const commonService = (
  paddleClientService: unknown,
  planService: PlanService,
  countryOf: (ip: string | null) => Promise<string | null> = async () => null,
) =>
  new CommonService(
    paddleClientService as never,
    planService,
    new VisitorCurrencyService(planService, { countryOf } as never),
  );

describe('CommonService.getPlans', () => {
  let originalEnv: Record<string, string | undefined>;
  let paddleClientService: { getPricePreview: ReturnType<typeof vi.fn> };
  let service: CommonService;

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

    process.env.GLOBAL_PAYMENT_PROVIDER = 'paddle';
    process.env.PUBLIC_DOMAIN_RU = 'thejungle.pro';

    paddleClientService = { getPricePreview: vi.fn() };
    service = commonService(paddleClientService, planServiceWith(CATALOG));
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("prices a visitor in their country's currency and names the country", async () => {
    process.env.GLOBAL_PAYMENT_PROVIDER = 'whop';
    const countryOf = vi.fn(async () => 'US');
    service = commonService(
      paddleClientService,
      planServiceWith([
        plan('whop', 30, 3.99, 'plan_eur_30'),
        { ...plan('whop', 30, 4.49, 'plan_usd_30'), id: 'whop-usd-30', currency: 'USD' },
      ]),
      countryOf,
    );

    const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '8.8.8.8' });

    expect(countryOf).toHaveBeenCalledWith('8.8.8.8');
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      planId: 'whop-usd-30',
      countryCode: 'US',
      planPricing: { currencyCode: 'USD' },
    });
  });

  it("returns no plans, rather than another provider's, when the provider has none on sale", async () => {
    service = commonService(
      paddleClientService,
      planServiceWith(CATALOG.filter((row) => row.provider !== 'paddle')),
    );

    const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

    expect(plans).toEqual([]);
    expect(paddleClientService.getPricePreview).not.toHaveBeenCalled();
  });

  describe('trial plans', () => {
    it('marks a one-time plan as the trial and a recurring plan, whatever its length, as not', async () => {
      service = commonService(
        paddleClientService,
        planServiceWith([
          { ...plan('yookassa', 3, 79), id: 'trial', type: 'one_time' },
          { ...plan('yookassa', 7, 150), id: 'week' },
        ]),
      );

      const plans = await service.getPlans({ origin: RU_ORIGIN, clientIp: null });

      expect(plans.map(({ planId, isTrial }) => ({ planId, isTrial }))).toEqual([
        { planId: 'trial', isTrial: true },
        { planId: 'week', isTrial: false },
      ]);
    });

    it('keeps a quoted Paddle trial marked as the trial', async () => {
      service = commonService(
        paddleClientService,
        planServiceWith([{ ...plan('paddle', 7, 0.99, 'pri_7'), type: 'one_time' }]),
      );
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'USD',
        address: { countryCode: 'US' },
        details: { lineItems: [{ price: { id: 'pri_7' }, totals: { total: '99' } }] },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(plans[0]).toMatchObject({ isTrial: true, planPricing: { currencyCode: 'USD' } });
    });
  });

  it('shows a fractional price as stored, e.g. a 0.99 EUR trial', async () => {
    process.env.GLOBAL_PAYMENT_PROVIDER = 'stripe';
    service = commonService(
      paddleClientService,
      planServiceWith([{ ...plan('stripe', 7, 0.99, 'price_7'), type: 'one_time' }]),
    );

    const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: null });

    expect(plans[0]?.planPricing).toMatchObject({ total: '0.99', currencyCode: 'EUR' });
  });

  describe('RU storefront', () => {
    it('prices in roubles and never asks Paddle, however the visitor geolocates', async () => {
      const plans = await service.getPlans({ origin: RU_ORIGIN, clientIp: '203.0.113.5' });

      expect(paddleClientService.getPricePreview).not.toHaveBeenCalled();
      expect(plans.map((plan) => plan.days)).toEqual([30, 180]);
      expect(plans.map((plan) => plan.planId)).toEqual(['yookassa-30', 'yookassa-180']);
      expect(plans[0]?.planPricing).toEqual({
        total: '500',
        monthly: '500',
        fullTotal: '500',
        discountPercent: 0,
        currencyCode: 'RUB',
      });
    });

    it('discounts a longer period against the 1-month rouble price', async () => {
      const plans = await service.getPlans({ origin: RU_ORIGIN, clientIp: null });

      expect(plans.find((plan) => plan.days === 180)?.planPricing).toMatchObject({
        discountPercent: 50,
        fullTotal: '3000',
        monthly: '250',
        total: '1500',
      });
    });

    it('treats a missing origin as RU, so an unknown caller is never quoted a foreign currency', async () => {
      const plans = await service.getPlans({ origin: null, clientIp: '203.0.113.5' });

      expect(paddleClientService.getPricePreview).not.toHaveBeenCalled();
      expect(plans[0]?.planPricing.currencyCode).toBe('RUB');
    });
  });

  describe('global storefront', () => {
    it("offers Stripe's own plans in EUR when Stripe is the active provider", async () => {
      process.env.GLOBAL_PAYMENT_PROVIDER = 'stripe';

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(paddleClientService.getPricePreview).not.toHaveBeenCalled();
      expect(plans.map((plan) => plan.planId)).toEqual(['stripe-30', 'stripe-180']);
      expect(plans.find((plan) => plan.days === 30)?.planPricing).toMatchObject({
        total: '6',
        currencyCode: 'EUR',
      });
    });

    it("quotes every Paddle-priced period in the currency Paddle resolves for the visitor's IP", async () => {
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'USD',
        address: { countryCode: 'US' },
        details: {
          lineItems: [
            { price: { id: 'pri_30' }, totals: { total: '999' } },
            { price: { id: 'pri_180' }, totals: { total: '2499' } },
          ],
        },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(paddleClientService.getPricePreview).toHaveBeenCalledWith(
        [
          { priceId: 'pri_30', quantity: 1 },
          { priceId: 'pri_180', quantity: 1 },
        ],
        '203.0.113.5',
      );
      expect(plans.find((plan) => plan.days === 30)).toEqual({
        planId: 'paddle-30',
        days: 30,
        countryCode: 'US',
        isTrial: false,
        planPricing: {
          total: '9.99',
          monthly: '9.99',
          fullTotal: '9.99',
          discountPercent: 0,
          currencyCode: 'USD',
        },
      });
      expect(plans.find((plan) => plan.days === 180)?.planPricing).toEqual({
        currencyCode: 'USD',
        discountPercent: 58,
        fullTotal: '59.94',
        monthly: '4.16',
        total: '24.99',
      });
    });

    it('reports a null country when the quote carries no detected location', async () => {
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'EUR',
        address: null,
        details: { lineItems: [{ price: { id: 'pri_30' }, totals: { total: '699' } }] },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: null });

      expect(plans.find((plan) => plan.days === 30)?.countryCode).toBeNull();
    });

    it('falls back to the static EUR table when Paddle is unreachable', async () => {
      paddleClientService.getPricePreview.mockRejectedValue(new Error('paddle down'));

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(plans.find((plan) => plan.days === 30)?.planPricing).toEqual({
        total: '6',
        monthly: '6',
        fullTotal: '6',
        discountPercent: 0,
        currencyCode: 'EUR',
      });
    });

    it('leaves a period Paddle did not quote on its EUR pricing', async () => {
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'USD',
        address: { countryCode: 'US' },
        details: { lineItems: [{ price: { id: 'pri_30' }, totals: { total: '999' } }] },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(plans.find((plan) => plan.days === 30)?.planPricing.currencyCode).toBe('USD');
      expect(plans.find((plan) => plan.days === 180)?.planPricing.currencyCode).toBe('EUR');
    });

    it('renders a zero-decimal currency without cents', async () => {
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'JPY',
        address: { countryCode: 'JP' },
        details: { lineItems: [{ price: { id: 'pri_30' }, totals: { total: '1200' } }] },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(plans.find((plan) => plan.days === 30)?.planPricing).toMatchObject({
        total: '1200',
        monthly: '1200',
        currencyCode: 'JPY',
      });
    });
  });
});
