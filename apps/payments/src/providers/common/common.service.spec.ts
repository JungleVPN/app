import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommonService } from './common.service';

const ENV_KEYS = [
  'ALLOWED_PERIOD',
  'PUBLIC_DOMAIN_RU',
  'PRICE_EUR_MONTH_1',
  'PRICE_RUB_MONTH_1',
  'PRICE_EUR_MONTH_3',
  'PRICE_RUB_MONTH_3',
  'PADDLE_PRICE_ID_MONTH_1',
  'PADDLE_PRICE_ID_MONTH_3',
] as const;

const RU_ORIGIN = 'https://thejungle.pro';
const GLOBAL_ORIGIN = 'https://jungle-vpn.com';

describe('CommonService.getPlans', () => {
  let originalEnv: Record<string, string | undefined>;
  let paddleClientService: { getPricePreview: ReturnType<typeof vi.fn> };
  let service: CommonService;

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

    process.env.ALLOWED_PERIOD = '1,3';
    process.env.PUBLIC_DOMAIN_RU = 'thejungle.pro';
    process.env.PRICE_EUR_MONTH_1 = '6';
    process.env.PRICE_RUB_MONTH_1 = '500';
    process.env.PRICE_EUR_MONTH_3 = '15';
    process.env.PRICE_RUB_MONTH_3 = '1200';
    process.env.PADDLE_PRICE_ID_MONTH_1 = 'pri_month_1';
    process.env.PADDLE_PRICE_ID_MONTH_3 = 'pri_month_3';

    paddleClientService = { getPricePreview: vi.fn() };
    service = new CommonService(paddleClientService as never);
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  describe('RU storefront', () => {
    it('prices in roubles and never asks Paddle, however the visitor geolocates', async () => {
      const plans = await service.getPlans({ origin: RU_ORIGIN, clientIp: '203.0.113.5' });

      expect(paddleClientService.getPricePreview).not.toHaveBeenCalled();
      expect(plans.map((plan) => plan.period)).toEqual([1, 3]);
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

      expect(plans.find((plan) => plan.period === 3)?.planPricing).toMatchObject({
        total: '1200',
        monthly: '400',
        fullTotal: '1500',
        discountPercent: 20,
      });
    });

    it('treats a missing origin as RU, so an unknown caller is never quoted a foreign currency', async () => {
      const plans = await service.getPlans({ origin: null, clientIp: '203.0.113.5' });

      expect(paddleClientService.getPricePreview).not.toHaveBeenCalled();
      expect(plans[0]?.planPricing.currencyCode).toBe('RUB');
    });
  });

  describe('global storefront', () => {
    it("quotes every Paddle-priced period in the currency Paddle resolves for the visitor's IP", async () => {
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'USD',
        address: { countryCode: 'US' },
        details: {
          lineItems: [
            { price: { id: 'pri_month_1' }, totals: { total: '999' } },
            { price: { id: 'pri_month_3' }, totals: { total: '2499' } },
          ],
        },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(paddleClientService.getPricePreview).toHaveBeenCalledWith(
        [
          { priceId: 'pri_month_1', quantity: 1 },
          { priceId: 'pri_month_3', quantity: 1 },
        ],
        '203.0.113.5',
      );
      expect(plans.find((plan) => plan.period === 1)).toEqual({
        period: 1,
        countryCode: 'US',
        planPricing: {
          total: '9.99',
          monthly: '9.99',
          fullTotal: '9.99',
          discountPercent: 0,
          currencyCode: 'USD',
        },
      });
      expect(plans.find((plan) => plan.period === 3)?.planPricing).toEqual({
        total: '24.99',
        monthly: '8.33',
        fullTotal: '29.97',
        discountPercent: 17,
        currencyCode: 'USD',
      });
    });

    it('reports a null country when the quote carries no detected location', async () => {
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'EUR',
        address: null,
        details: { lineItems: [{ price: { id: 'pri_month_1' }, totals: { total: '699' } }] },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: null });

      expect(plans.find((plan) => plan.period === 1)?.countryCode).toBeNull();
    });

    it('falls back to the static EUR table when Paddle is unreachable', async () => {
      paddleClientService.getPricePreview.mockRejectedValue(new Error('paddle down'));

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(plans.find((plan) => plan.period === 1)?.planPricing).toEqual({
        total: '6.00',
        monthly: '6.00',
        fullTotal: '6.00',
        discountPercent: 0,
        currencyCode: 'EUR',
      });
    });

    it('skips the Paddle lookup entirely when no period has a catalog price', async () => {
      delete process.env.PADDLE_PRICE_ID_MONTH_1;
      delete process.env.PADDLE_PRICE_ID_MONTH_3;

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(paddleClientService.getPricePreview).not.toHaveBeenCalled();
      expect(plans.every((plan) => plan.planPricing.currencyCode === 'EUR')).toBe(true);
    });

    it('leaves a period Paddle did not quote on its EUR pricing', async () => {
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'USD',
        address: { countryCode: 'US' },
        details: { lineItems: [{ price: { id: 'pri_month_1' }, totals: { total: '999' } }] },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(plans.find((plan) => plan.period === 1)?.planPricing.currencyCode).toBe('USD');
      expect(plans.find((plan) => plan.period === 3)?.planPricing.currencyCode).toBe('EUR');
    });

    it('renders a zero-decimal currency without cents', async () => {
      paddleClientService.getPricePreview.mockResolvedValue({
        currencyCode: 'JPY',
        address: { countryCode: 'JP' },
        details: { lineItems: [{ price: { id: 'pri_month_1' }, totals: { total: '1200' } }] },
      });

      const plans = await service.getPlans({ origin: GLOBAL_ORIGIN, clientIp: '203.0.113.5' });

      expect(plans.find((plan) => plan.period === 1)?.planPricing).toMatchObject({
        total: '1200',
        monthly: '1200',
        currencyCode: 'JPY',
      });
    });
  });
});
