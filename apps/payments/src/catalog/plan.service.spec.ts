import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import type { Plan } from '@workspace/database';
import { describe, expect, it } from 'vitest';
import { PlanService } from './plan.service';

const plan = (overrides: Partial<Plan> = {}): Plan => ({
  id: '00000000-0000-4000-8000-000000000030',
  type: 'recurring',
  billingPeriod: 30,
  basePrice: 200,
  provider: 'yookassa',
  currency: 'RUB',
  providerPriceId: null,
  availableForPurchase: true,
  customData: {},
  ...overrides,
});

const serviceWith = (rows: Plan[]) => new PlanService({ find: async () => rows } as never);

describe('PlanService', () => {
  describe('listForSale', () => {
    it("lists only the provider's plans on sale, shortest period first", async () => {
      const service = serviceWith([
        plan({ id: 'year', billingPeriod: 365 }),
        plan({ id: 'month', billingPeriod: 30 }),
        plan({ id: 'retired', billingPeriod: 90, availableForPurchase: false }),
        plan({ id: 'stripe', provider: 'stripe', providerPriceId: 'price_1' }),
      ]);

      const plans = await service.listForSale('yookassa', 'RUB');

      expect(plans.map((row) => row.id)).toEqual(['month', 'year']);
    });

    it('lists only the plans priced in the requested currency', async () => {
      const service = serviceWith([
        plan({ id: 'whop-eur', provider: 'whop', currency: 'EUR' }),
        plan({ id: 'whop-usd', provider: 'whop', currency: 'USD' }),
      ]);

      const plans = await service.listForSale('whop', 'USD');

      expect(plans.map((row) => row.id)).toEqual(['whop-usd']);
    });
  });

  describe('currenciesForSale', () => {
    it('lists each currency the provider has a plan on sale in, once', async () => {
      const service = serviceWith([
        plan({ provider: 'whop', currency: 'EUR' }),
        plan({ provider: 'whop', currency: 'EUR', billingPeriod: 180 }),
        plan({ provider: 'whop', currency: 'USD' }),
        plan({ provider: 'whop', currency: 'GBP', availableForPurchase: false }),
        plan({ provider: 'paddle', currency: 'CHF' }),
      ]);

      await expect(service.currenciesForSale('whop')).resolves.toEqual(['EUR', 'USD']);
    });
  });

  describe('getForCheckout', () => {
    const paddle = (overrides: Partial<Plan> = {}) =>
      plan({
        id: 'paddle-30',
        provider: 'paddle',
        currency: 'EUR',
        providerPriceId: 'pri_30',
        ...overrides,
      });

    it('returns a plan on sale at the provider taking the payment, in the payer currency', async () => {
      const onSale = paddle();

      await expect(
        serviceWith([onSale]).getForCheckout('paddle-30', 'paddle', 'EUR'),
      ).resolves.toBe(onSale);
    });

    it.each([
      ['an unknown id', [paddle()], 'nope'],
      ['a plan taken off sale', [paddle({ availableForPurchase: false })], 'paddle-30'],
      [
        'a catalog plan with no provider price id',
        [paddle({ providerPriceId: null })],
        'paddle-30',
      ],
    ])('rejects %s', async (_case, rows, planId) => {
      await expect(
        serviceWith(rows).getForCheckout(planId, 'paddle', 'EUR'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // `/plans` prices a visitor in their own currency, but the plan id comes
    // back from the browser — so a payer can post the id of a cheaper
    // currency's plan. They are charged the same period in their own currency.
    it('charges a plan picked in another currency at the payer currency price for that period', async () => {
      const eur = plan({
        id: 'whop-eur',
        provider: 'whop',
        currency: 'EUR',
        providerPriceId: 'p1',
      });
      const service = serviceWith([
        eur,
        plan({ id: 'whop-usd', provider: 'whop', currency: 'USD', providerPriceId: 'p2' }),
      ]);

      await expect(service.getForCheckout('whop-usd', 'whop', 'EUR')).resolves.toBe(eur);
    });

    it('rejects a plan whose period is not sold in the payer currency', async () => {
      const service = serviceWith([
        plan({ id: 'whop-eur', provider: 'whop', currency: 'EUR', providerPriceId: 'p1' }),
        plan({
          id: 'whop-usd-180',
          provider: 'whop',
          currency: 'USD',
          billingPeriod: 180,
          providerPriceId: 'p2',
        }),
      ]);

      await expect(service.getForCheckout('whop-usd-180', 'whop', 'EUR')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    // The page picks the provider from the user's stored scope, `/plans` from
    // the request origin — so a RU user browsing the global domain can post a
    // Paddle plan to YooKassa. They are charged the paying provider's own
    // price for the same period, never the other storefront's.
    it("charges a plan from the other storefront at the paying provider's price for that period", async () => {
      const ru = plan({ id: 'ru-30' });
      const service = serviceWith([ru, paddle({ basePrice: 6 })]);

      await expect(service.getForCheckout('paddle-30', 'yookassa', 'RUB')).resolves.toBe(ru);
    });

    it('rejects a plan from the other storefront whose period the paying provider does not sell', async () => {
      const service = serviceWith([
        plan({ id: 'ru-30' }),
        paddle({ id: 'paddle-180', billingPeriod: 180 }),
      ]);

      await expect(service.getForCheckout('paddle-180', 'yookassa', 'RUB')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a plan from the other storefront that the paying provider sells as another type', async () => {
      const service = serviceWith([
        plan({ id: 'ru-7', billingPeriod: 7 }),
        paddle({ id: 'paddle-trial', type: 'one_time', billingPeriod: 7 }),
      ]);

      await expect(
        service.getForCheckout('paddle-trial', 'yookassa', 'RUB'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a YooKassa plan without a provider price id', async () => {
      const ru = plan({ id: 'ru-30' });

      await expect(serviceWith([ru]).getForCheckout('ru-30', 'yookassa', 'RUB')).resolves.toBe(ru);
    });
  });

  describe('findForRenewal', () => {
    it('prices a renewal from the plan on sale for that period', async () => {
      const service = serviceWith([
        plan({ id: 'old', availableForPurchase: false, basePrice: 150 }),
        plan({ id: 'current', basePrice: 200 }),
        plan({ id: 'other-period', billingPeriod: 180 }),
      ]);

      await expect(service.findForRenewal('yookassa', 30, 'RUB')).resolves.toMatchObject({
        id: 'current',
      });
    });

    it('still renews a period that has been taken off sale', async () => {
      const service = serviceWith([plan({ id: 'retired', availableForPurchase: false })]);

      await expect(service.findForRenewal('yookassa', 30, 'RUB')).resolves.toMatchObject({
        id: 'retired',
      });
    });

    it('prices a renewal in the currency the subscriber pays in', async () => {
      const service = serviceWith([
        plan({ id: 'eur', provider: 'whop', currency: 'EUR' }),
        plan({ id: 'usd', provider: 'whop', currency: 'USD' }),
      ]);

      await expect(service.findForRenewal('whop', 30, 'USD')).resolves.toMatchObject({ id: 'usd' });
    });

    it('throws when the period was never priced in that currency', async () => {
      await expect(serviceWith([plan()]).findForRenewal('yookassa', 30, 'EUR')).rejects.toThrow(
        /EUR/,
      );
    });

    it('throws when the period was never priced', async () => {
      await expect(serviceWith([plan()]).findForRenewal('yookassa', 7, 'RUB')).rejects.toThrow(/7/);
    });
  });

  describe('isTrial', () => {
    it('is true for a period the provider sells as a one-time plan', async () => {
      const service = serviceWith([plan({ billingPeriod: 7, type: 'one_time' })]);

      await expect(service.isTrial('yookassa', 7, 'RUB')).resolves.toBe(true);
    });

    it('is false for a recurring plan, whatever its length', async () => {
      const service = serviceWith([plan({ billingPeriod: 7 })]);

      await expect(service.isTrial('yookassa', 7, 'RUB')).resolves.toBe(false);
    });

    it("is false for another provider's one-time plan", async () => {
      const service = serviceWith([
        plan({ billingPeriod: 7, type: 'one_time', provider: 'paddle' }),
      ]);

      await expect(service.isTrial('yookassa', 7, 'RUB')).resolves.toBe(false);
    });

    it('is false for a one-time plan in another currency', async () => {
      const service = serviceWith([
        plan({ billingPeriod: 7, type: 'one_time', provider: 'whop', currency: 'EUR' }),
        plan({ billingPeriod: 7, provider: 'whop', currency: 'USD' }),
      ]);

      await expect(service.isTrial('whop', 7, 'USD')).resolves.toBe(false);
    });

    it('is false for a period with no plan, such as an extra device', async () => {
      await expect(serviceWith([plan()]).isTrial('yookassa', 0, 'RUB')).resolves.toBe(false);
    });
  });

  describe('findByAmount', () => {
    it('matches a paid amount to its plan, on sale or not', async () => {
      const service = serviceWith([
        plan({ id: 'month', provider: 'stripe', basePrice: 6 }),
        plan({
          id: 'half',
          provider: 'stripe',
          billingPeriod: 180,
          basePrice: 15,
          availableForPurchase: false,
        }),
      ]);

      await expect(service.findByAmount('stripe', 15, 'RUB')).resolves.toMatchObject({
        id: 'half',
      });
    });

    it('matches a fractional price exactly', async () => {
      const service = serviceWith([plan({ id: 'trial', provider: 'stripe', basePrice: 0.99 })]);

      await expect(service.findByAmount('stripe', 99 / 100, 'RUB')).resolves.toMatchObject({
        id: 'trial',
      });
    });

    it('throws on an amount no plan is priced at', async () => {
      const service = serviceWith([plan({ provider: 'stripe', basePrice: 6 })]);

      await expect(service.findByAmount('stripe', 999, 'RUB')).rejects.toThrow(/999/);
    });

    it('matches only plans priced in the currency that was paid', async () => {
      const service = serviceWith([
        plan({ id: 'eur-month', provider: 'stripe', currency: 'EUR', basePrice: 6 }),
        plan({
          id: 'usd-half',
          provider: 'stripe',
          currency: 'USD',
          basePrice: 6,
          billingPeriod: 180,
        }),
      ]);

      await expect(service.findByAmount('stripe', 6, 'USD')).resolves.toMatchObject({
        id: 'usd-half',
      });
    });

    it('refuses to guess when two periods share the amount', async () => {
      const service = serviceWith([
        plan({ provider: 'stripe', basePrice: 6 }),
        plan({ provider: 'stripe', basePrice: 6, billingPeriod: 180 }),
      ]);

      await expect(service.findByAmount('stripe', 6, 'RUB')).rejects.toThrow(/ambiguous/i);
    });
  });

  describe('findByProviderPriceId', () => {
    const whop = (overrides: Partial<Plan> = {}) =>
      plan({ provider: 'whop', providerPriceId: 'plan_30', ...overrides });

    it("returns the provider's plan billed under that catalog id", async () => {
      const onSale = whop({ id: 'whop-30' });
      const service = serviceWith([onSale, whop({ id: 'whop-90', providerPriceId: 'plan_90' })]);

      await expect(service.findByProviderPriceId('whop', 'plan_30')).resolves.toBe(onSale);
    });

    it('still resolves a plan taken off sale, so existing subscribers keep renewing', async () => {
      const retired = whop({ id: 'whop-retired', availableForPurchase: false });
      const service = serviceWith([retired]);

      await expect(service.findByProviderPriceId('whop', 'plan_30')).resolves.toBe(retired);
    });

    it("ignores another provider's plan carrying the same id", async () => {
      const service = serviceWith([whop({ provider: 'paddle' })]);

      await expect(service.findByProviderPriceId('whop', 'plan_30')).resolves.toBeUndefined();
    });

    it('returns undefined for an id no plan is billed under', async () => {
      const service = serviceWith([whop()]);

      await expect(service.findByProviderPriceId('whop', 'plan_unknown')).resolves.toBeUndefined();
    });
  });
});
