import type { ToltReferral } from '@workspace/database';
import { describe, expect, it, vi } from 'vitest';
import type { FxRateService } from './fx-rate.service';
import { ToltApiError, type ToltClient } from './tolt.client';
import { ToltService } from './tolt.service';
import type { ToltCreateCustomerInput, ToltCreateTransactionInput } from './tolt.types';

const PARTNER = 'part_xyz';
const USER = 'user-uuid-1';

function referralRow(overrides: Partial<ToltReferral> = {}): ToltReferral {
  return {
    userId: USER,
    referralCode: 'jimhalpert',
    partnerId: PARTNER,
    clickId: 'clk_1',
    toltCustomerId: 'cus_abc',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ToltReferral;
}

function setup(
  opts: {
    referral?: ToltReferral | null;
    eurRubRate?: number | null;
    createCustomer?: (input: ToltCreateCustomerInput) => Promise<unknown>;
    createTransaction?: (input: ToltCreateTransactionInput) => Promise<unknown>;
  } = {},
) {
  const repository = {
    findOneBy: vi
      .fn()
      .mockResolvedValue(opts.referral === undefined ? referralRow() : opts.referral),
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  };

  const client = {
    createCustomer: vi.fn(
      opts.createCustomer ??
        ((_input: ToltCreateCustomerInput) => Promise.resolve({ id: 'cus_new' })),
    ),
    createTransaction: vi.fn(
      opts.createTransaction ??
        ((_input: ToltCreateTransactionInput) => Promise.resolve({ id: 'txn_1' })),
    ),
  };

  const rate = opts.eurRubRate === undefined ? 95.1834 : opts.eurRubRate;
  const fx = {
    convertRubToEurCents: vi.fn((rub: number) =>
      Promise.resolve(rate === null ? null : Math.round((rub / rate) * 100)),
    ),
  };

  const service = new ToltService(
    repository as never,
    client as unknown as ToltClient,
    fx as unknown as FxRateService,
  );

  return { service, repository, client, fx };
}

const stripeConversion = {
  userId: USER,
  provider: 'stripe' as const,
  chargeId: 'in_123',
  amount: 3.6,
  currency: 'EUR' as const,
  periodMonths: 12,
};

const yookassaConversion = {
  userId: USER,
  provider: 'yookassa' as const,
  chargeId: 'yk_123',
  amount: 599,
  currency: 'RUB' as const,
  periodMonths: 1,
};

describe('ToltService.reportConversion — attribution gate', () => {
  it('does nothing when the user was never referred', async () => {
    const { service, client } = setup({ referral: null });
    await service.reportConversion(stripeConversion);
    expect(client.createTransaction).not.toHaveBeenCalled();
    expect(client.createCustomer).not.toHaveBeenCalled();
  });

  it('skips extra-device purchases, which earn no commission', async () => {
    const { service, client } = setup();
    await service.reportConversion({ ...stripeConversion, purpose: 'extra_device' });
    expect(client.createTransaction).not.toHaveBeenCalled();
  });

  it('reports a subscription purchase', async () => {
    const { service, client } = setup();
    await service.reportConversion({ ...stripeConversion, purpose: 'subscription' });
    expect(client.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('refuses a non-positive amount rather than posting a zero transaction', async () => {
    const { service, client } = setup();
    await service.reportConversion({ ...stripeConversion, amount: 0 });
    expect(client.createTransaction).not.toHaveBeenCalled();
  });
});

describe('ToltService.reportConversion — amounts', () => {
  it('sends EUR as minor units without touching the FX service', async () => {
    const { service, client, fx } = setup();
    await service.reportConversion(stripeConversion);
    expect(client.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 360 }));
    expect(fx.convertRubToEurCents).not.toHaveBeenCalled();
  });

  it('converts RUB to EUR cents at the live rate', async () => {
    const { service, client } = setup({ eurRubRate: 95.1834 });
    await service.reportConversion(yookassaConversion);
    // 599 RUB / 95.1834 = 6.2931 EUR
    expect(client.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 629 }));
  });

  it('skips reporting entirely when no FX rate can be resolved', async () => {
    const { service, client } = setup({ eurRubRate: null });
    await service.reportConversion(yookassaConversion);
    expect(client.createTransaction).not.toHaveBeenCalled();
  });

  it('reports the amount actually charged, so promo discounts flow through', async () => {
    const { service, client } = setup();
    await service.reportConversion({ ...stripeConversion, amount: 1.8 });
    expect(client.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 180 }));
  });
});

describe('ToltService.reportConversion — transaction payload', () => {
  it('always marks the charge as a subscription so Tolt applies recurring rates', async () => {
    const { service, client } = setup();
    await service.reportConversion(stripeConversion);
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ billing_type: 'subscription' }),
    );
  });

  it('carries the charge id and provider for reconciliation', async () => {
    const { service, client } = setup();
    await service.reportConversion(yookassaConversion);
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ charge_id: 'yk_123', source: 'yookassa' }),
    );
  });

  it('passes the stored click id through', async () => {
    const { service, client } = setup({ referral: referralRow({ clickId: 'clk_9' }) });
    await service.reportConversion(stripeConversion);
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ click_id: 'clk_9' }),
    );
  });

  it('targets the stored Tolt customer', async () => {
    const { service, client } = setup({ referral: referralRow({ toltCustomerId: 'cus_stored' }) });
    await service.reportConversion(stripeConversion);
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: 'cus_stored' }),
    );
  });
});

describe('ToltService.reportConversion — interval mapping', () => {
  it('maps a 1-month plan to month', async () => {
    const { service, client } = setup();
    await service.reportConversion({ ...stripeConversion, periodMonths: 1 });
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ interval: 'month' }),
    );
  });

  it('maps a 12-month plan to year', async () => {
    const { service, client } = setup();
    await service.reportConversion({ ...stripeConversion, periodMonths: 12 });
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ interval: 'year' }),
    );
  });

  it.each([
    3, 6,
  ])('omits interval for a %i-month plan, which Tolt cannot express', async (months) => {
    const { service, client } = setup();
    await service.reportConversion({ ...stripeConversion, periodMonths: months });
    expect(client.createTransaction.mock.calls[0][0]).not.toHaveProperty('interval');
  });
});

describe('ToltService.reportConversion — self-healing customer registration', () => {
  it('does not re-register a customer that already exists', async () => {
    const { service, client } = setup();
    await service.reportConversion(stripeConversion);
    expect(client.createCustomer).not.toHaveBeenCalled();
  });

  it('registers the customer when lead capture had failed, then reports', async () => {
    const { service, client, repository } = setup({
      referral: referralRow({ toltCustomerId: null }),
    });

    await service.reportConversion(stripeConversion);

    expect(client.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ partner_id: PARTNER, customer_id: USER }),
    );
    expect(repository.update).toHaveBeenCalledWith(
      { userId: USER },
      expect.objectContaining({ toltCustomerId: 'cus_new' }),
    );
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: 'cus_new' }),
    );
  });

  it('does not post a transaction when the recovery registration fails', async () => {
    const { service, client } = setup({
      referral: referralRow({ toltCustomerId: null }),
      createCustomer: () => Promise.reject(new ToltApiError('boom', 500, false)),
    });

    await service.reportConversion(stripeConversion);

    expect(client.createTransaction).not.toHaveBeenCalled();
  });
});

describe('ToltService.reportConversion — failure containment', () => {
  it('never throws when Tolt rejects the transaction', async () => {
    const { service } = setup({
      createTransaction: () => Promise.reject(new ToltApiError('rejected', 400, false)),
    });
    await expect(service.reportConversion(stripeConversion)).resolves.toBeUndefined();
  });

  it('never throws when the referral lookup fails', async () => {
    const { service, repository } = setup();
    repository.findOneBy.mockRejectedValue(new Error('db down'));
    await expect(service.reportConversion(stripeConversion)).resolves.toBeUndefined();
  });
});

describe('ToltService.captureReferral', () => {
  const capture = {
    userId: USER,
    referralCode: 'jimhalpert',
    partnerId: PARTNER,
    clickId: 'clk_1',
    email: 'jim@example.com',
  };

  it('registers a Tolt lead and stores the returned customer id', async () => {
    const { service, client, repository } = setup({ referral: null });

    await service.captureReferral(capture);

    expect(client.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jim@example.com',
        partner_id: PARTNER,
        customer_id: USER,
        status: 'lead',
      }),
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, partnerId: PARTNER, toltCustomerId: 'cus_new' }),
    );
  });

  it('identifies the user by id when no email is available', async () => {
    const { service, client } = setup({ referral: null });
    await service.captureReferral({ ...capture, email: null });
    expect(client.createCustomer).toHaveBeenCalledWith(expect.objectContaining({ email: USER }));
  });

  it('keeps the first affiliate — a later capture does not overwrite', async () => {
    const { service, client, repository } = setup({
      referral: referralRow({ partnerId: 'part_first' }),
    });

    await service.captureReferral({ ...capture, partnerId: 'part_second' });

    expect(repository.save).not.toHaveBeenCalled();
    expect(client.createCustomer).not.toHaveBeenCalled();
  });

  it('still stores the referral when Tolt lead registration fails', async () => {
    const { service, repository } = setup({
      referral: null,
      createCustomer: () => Promise.reject(new ToltApiError('down', 503, true)),
    });

    await service.captureReferral(capture);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, toltCustomerId: null }),
    );
  });

  it('never throws, so capture cannot break the caller', async () => {
    const { service, repository } = setup({ referral: null });
    repository.save.mockRejectedValue(new Error('db down'));
    await expect(service.captureReferral(capture)).resolves.toBeUndefined();
  });
});
