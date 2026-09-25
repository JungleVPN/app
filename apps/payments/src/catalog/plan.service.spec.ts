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

      const plans = await service.listForSale('yookassa');

      expect(plans.map((row) => row.id)).toEqual(['month', 'year']);
    });
  });

  describe('getForCheckout', () => {
    const onSale = plan({ id: 'paddle-30', provider: 'paddle', providerPriceId: 'pri_30' });

    it('returns a plan on sale at the provider taking the payment', async () => {
      const service = serviceWith([onSale]);

      await expect(service.getForCheckout('paddle-30', 'paddle')).resolves.toBe(onSale);
    });

    it.each([
      ['an unknown id', [onSale], 'nope'],
      ['a plan taken off sale', [{ ...onSale, availableForPurchase: false }], 'paddle-30'],
      [
        'a catalog plan with no provider price id',
        [{ ...onSale, providerPriceId: null }],
        'paddle-30',
      ],
    ])('rejects %s', async (_case, rows, planId) => {
      await expect(serviceWith(rows).getForCheckout(planId, 'paddle')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    // The page picks the provider from the user's stored scope, `/plans` from
    // the request origin — so a RU user browsing the global domain can post a
    // Paddle plan to YooKassa. They are charged the paying provider's own
    // price for the same period, never the other storefront's.
    it("charges a plan from the other storefront at the paying provider's price for that period", async () => {
      const ru = plan({ id: 'ru-30' });
      const service = serviceWith([
        ru,
        plan({ id: 'paddle-30', provider: 'paddle', basePrice: 6, providerPriceId: 'pri_30' }),
      ]);

      await expect(service.getForCheckout('paddle-30', 'yookassa')).resolves.toBe(ru);
    });

    it('rejects a plan from the other storefront whose period the paying provider does not sell', async () => {
      const service = serviceWith([
        plan({ id: 'ru-30' }),
        plan({ id: 'paddle-180', provider: 'paddle', billingPeriod: 180, providerPriceId: 'pri' }),
      ]);

      await expect(service.getForCheckout('paddle-180', 'yookassa')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts a YooKassa plan without a provider price id', async () => {
      const ru = plan({ id: 'ru-30' });

      await expect(serviceWith([ru]).getForCheckout('ru-30', 'yookassa')).resolves.toBe(ru);
    });
  });

  describe('findForRenewal', () => {
    it('prices a renewal from the plan on sale for that period', async () => {
      const service = serviceWith([
        plan({ id: 'old', availableForPurchase: false, basePrice: 150 }),
        plan({ id: 'current', basePrice: 200 }),
        plan({ id: 'other-period', billingPeriod: 180 }),
      ]);

      await expect(service.findForRenewal('yookassa', 30)).resolves.toMatchObject({
        id: 'current',
      });
    });

    it('still renews a period that has been taken off sale', async () => {
      const service = serviceWith([plan({ id: 'retired', availableForPurchase: false })]);

      await expect(service.findForRenewal('yookassa', 30)).resolves.toMatchObject({
        id: 'retired',
      });
    });

    it('throws when the period was never priced', async () => {
      await expect(serviceWith([plan()]).findForRenewal('yookassa', 7)).rejects.toThrow(/7/);
    });
  });

  describe('isTrial', () => {
    it('is true for a period the provider sells as a one-time plan', async () => {
      const service = serviceWith([plan({ billingPeriod: 7, type: 'one_time' })]);

      await expect(service.isTrial('yookassa', 7)).resolves.toBe(true);
    });

    it('is false for a recurring plan, whatever its length', async () => {
      const service = serviceWith([plan({ billingPeriod: 7 })]);

      await expect(service.isTrial('yookassa', 7)).resolves.toBe(false);
    });

    it("is false for another provider's one-time plan", async () => {
      const service = serviceWith([
        plan({ billingPeriod: 7, type: 'one_time', provider: 'paddle' }),
      ]);

      await expect(service.isTrial('yookassa', 7)).resolves.toBe(false);
    });

    it('is false for a period with no plan, such as an extra device', async () => {
      await expect(serviceWith([plan()]).isTrial('yookassa', 0)).resolves.toBe(false);
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

      await expect(service.findByAmount('stripe', 15)).resolves.toMatchObject({ id: 'half' });
    });

    it('matches a fractional price exactly', async () => {
      const service = serviceWith([plan({ id: 'trial', provider: 'stripe', basePrice: 0.99 })]);

      await expect(service.findByAmount('stripe', 99 / 100)).resolves.toMatchObject({
        id: 'trial',
      });
    });

    it('throws on an amount no plan is priced at', async () => {
      const service = serviceWith([plan({ provider: 'stripe', basePrice: 6 })]);

      await expect(service.findByAmount('stripe', 999)).rejects.toThrow(/999/);
    });

    it('refuses to guess when two periods share the amount', async () => {
      const service = serviceWith([
        plan({ provider: 'stripe', basePrice: 6 }),
        plan({ provider: 'stripe', basePrice: 6, billingPeriod: 180 }),
      ]);

      await expect(service.findByAmount('stripe', 6)).rejects.toThrow(/ambiguous/i);
    });
  });
});
