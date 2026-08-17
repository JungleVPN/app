import type { ToltReferral, ToltTransaction } from '@workspace/database';
import { describe, expect, it, vi } from 'vitest';
import type { AdminService } from '../admin/admin.service';
import type { FxRateService } from './fx-rate.service';
import { ToltApiError, type ToltClient } from './tolt.client';
import { ToltService } from './tolt.service';
import type {
  ToltCreateClickInput,
  ToltCreateCustomerInput,
  ToltCreateTransactionInput,
} from './tolt.types';

const PARTNER = 'part_xyz';
const USER = 'user-uuid-1';

/** A user who has already paid: customer created, attribution frozen. */
function referralRow(overrides: Partial<ToltReferral> = {}): ToltReferral {
  return {
    userId: USER,
    referralCode: 'jimhalpert',
    partnerId: PARTNER,
    clickId: 'clk_1',
    toltCustomerId: 'cus_abc',
    convertedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ToltReferral;
}

/** A referred user who has not paid yet: no Tolt customer, still overwritable. */
function unconvertedRow(overrides: Partial<ToltReferral> = {}): ToltReferral {
  return referralRow({ toltCustomerId: null, convertedAt: null, ...overrides });
}

function setup(
  opts: {
    referral?: ToltReferral | null;
    eurRubRate?: number | null;
    createCustomer?: (input: ToltCreateCustomerInput) => Promise<unknown>;
    createTransaction?: (input: ToltCreateTransactionInput) => Promise<unknown>;
    createClick?: (input: ToltCreateClickInput) => Promise<unknown>;
    refundTransaction?: (id: string) => Promise<unknown>;
    existingTransaction?: Partial<ToltTransaction> | null;
    insert?: (row: Partial<ToltTransaction>) => Promise<unknown>;
    hasEverPaid?: boolean;
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
    createClick: vi.fn(
      opts.createClick ??
        ((_input: ToltCreateClickInput) =>
          Promise.resolve({ id: 'clk_resolved', partner_id: 'part_resolved' })),
    ),
    refundTransaction: vi.fn(
      opts.refundTransaction ?? ((_id: string) => Promise.resolve({ id: 'txn_1' })),
    ),
  };

  const txRepository = {
    findOneBy: vi.fn().mockResolvedValue(opts.existingTransaction ?? null),
    insert: vi.fn(opts.insert ?? (() => Promise.resolve(undefined))),
    update: vi.fn().mockResolvedValue(undefined),
  };

  const rate = opts.eurRubRate === undefined ? 95.1834 : opts.eurRubRate;
  const fx = {
    convertRubToEurCents: vi.fn((rub: number) =>
      Promise.resolve(rate === null ? null : Math.round((rub / rate) * 100)),
    ),
  };

  const admin = {
    hasEverPaid: vi.fn().mockResolvedValue(opts.hasEverPaid ?? false),
  };

  const service = new ToltService(
    repository as never,
    txRepository as never,
    client as unknown as ToltClient,
    fx as unknown as FxRateService,
    admin as unknown as AdminService,
  );

  return { service, repository, txRepository, client, fx, admin };
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

// The Tolt customer is created here, on the first payment — never earlier.
// Tolt fixes a customer's partner at creation and cannot move them, so creating
// one at signup would lock attribution to whoever referred the user first.
describe('ToltService.reportConversion — customer creation on first payment', () => {
  it('creates the Tolt customer against the partner who converted them', async () => {
    const { service, client } = setup({ referral: unconvertedRow() });

    await service.reportConversion(stripeConversion);

    expect(client.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ partner_id: PARTNER, customer_id: USER, status: 'active' }),
    );
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: 'cus_new' }),
    );
  });

  it('freezes the attribution once the customer exists', async () => {
    const { service, repository } = setup({ referral: unconvertedRow() });

    await service.reportConversion(stripeConversion);

    expect(repository.update).toHaveBeenCalledWith(
      { userId: USER },
      expect.objectContaining({ toltCustomerId: 'cus_new', convertedAt: expect.any(Date) }),
    );
  });

  it('identifies the customer by the email captured at referral time', async () => {
    const { service, client } = setup({ referral: unconvertedRow({ email: 'jim@example.com' }) });
    await service.reportConversion(stripeConversion);
    expect(client.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jim@example.com' }),
    );
  });

  it('reuses the customer on renewals rather than creating another', async () => {
    const { service, client } = setup();
    await service.reportConversion(stripeConversion);
    expect(client.createCustomer).not.toHaveBeenCalled();
    expect(client.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('does not post a transaction when customer creation fails', async () => {
    const { service, client } = setup({
      referral: unconvertedRow(),
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

// Resolution lives here rather than in the browser so the API key stays on the
// server. Called once per affiliate landing, before the visitor has an account.
describe('ToltService.recordClick', () => {
  it('records the click and returns the partner it resolved to', async () => {
    const { service, client } = setup();

    const result = await service.recordClick({
      affCode: 'zaira',
      page: 'https://jungle.vpn/?aff=zaira',
      referrer: null,
    });

    expect(client.createClick).toHaveBeenCalledWith({
      param: 'aff',
      value: 'zaira',
      page: 'https://jungle.vpn/?aff=zaira',
      referrer: undefined,
    });
    expect(result).toEqual({ partnerId: 'part_resolved', clickId: 'clk_resolved' });
  });

  it('returns null for a code Tolt does not recognise', async () => {
    const { service } = setup({
      createClick: () => Promise.reject(new ToltApiError('Link not found', 404, false)),
    });

    await expect(service.recordClick({ affCode: 'mistyped' })).resolves.toBeNull();
  });

  it('never throws — a visitor landing must not see an error', async () => {
    const { service } = setup({
      createClick: () => Promise.reject(new Error('network down')),
    });

    await expect(service.recordClick({ affCode: 'zaira' })).resolves.toBeNull();
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

  it('stores the referral for a user who has none', async () => {
    const { service, repository } = setup({ referral: null });

    await service.captureReferral(capture);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER,
        referralCode: 'jimhalpert',
        partnerId: PARTNER,
        clickId: 'clk_1',
      }),
    );
  });

  it('touches Tolt not at all — no customer exists until the user pays', async () => {
    const { service, client } = setup({ referral: null });
    await service.captureReferral(capture);
    expect(client.createCustomer).not.toHaveBeenCalled();
  });

  // The browser cookie decides which partner is live, and the landing flow
  // replaces it on every new affiliate link. Overwriting here lets that decision
  // through, so whoever's link is current when the user pays gets the credit.
  it('overwrites an earlier referral while the user has not paid', async () => {
    const { service, repository } = setup({
      referral: unconvertedRow({ referralCode: 'first', partnerId: 'part_first' }),
    });

    await service.captureReferral({
      ...capture,
      referralCode: 'second',
      partnerId: 'part_second',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, referralCode: 'second', partnerId: 'part_second' }),
    );
  });

  // A partner can only earn on a sale they actually made. Without this, any
  // partner could farm the existing customer base by getting subscribers to
  // open one link: the next renewal would register a brand-new Tolt customer
  // under them and pay a first-payment commission on a sale they had no part in.
  it('refuses a first referral for someone who was already a paying customer', async () => {
    const { service, repository, admin } = setup({ referral: null, hasEverPaid: true });

    await service.captureReferral(capture);

    expect(admin.hasEverPaid).toHaveBeenCalledWith(USER);
    expect(repository.save).not.toHaveBeenCalled();
  });

  // The same rule applied to a row that exists but was never frozen — a payment
  // that went unreported (no FX rate, Tolt unreachable) still bought the first
  // partner their permanence.
  it('refuses to overwrite an unconverted referral once the user has paid', async () => {
    const { service, repository } = setup({
      referral: unconvertedRow({ partnerId: 'part_first' }),
      hasEverPaid: true,
    });

    await service.captureReferral({ ...capture, partnerId: 'part_second' });

    expect(repository.save).not.toHaveBeenCalled();
  });

  // The payment check is a best-effort guard on a best-effort path; if it
  // cannot be answered, capture proceeds rather than dropping attribution for
  // every genuinely new visitor.
  it('still captures when the payment history cannot be read', async () => {
    const { service, repository, admin } = setup({ referral: null });
    admin.hasEverPaid.mockRejectedValue(new Error('db down'));

    await service.captureReferral(capture);

    expect(repository.save).toHaveBeenCalled();
  });

  it('leaves a converted attribution alone — renewals belong to the seller', async () => {
    const { service, repository } = setup({
      referral: referralRow({ partnerId: 'part_first', convertedAt: new Date() }),
    });

    await service.captureReferral({ ...capture, partnerId: 'part_second' });

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('never throws, so capture cannot break the caller', async () => {
    const { service, repository } = setup({ referral: null });
    repository.save.mockRejectedValue(new Error('db down'));
    await expect(service.captureReferral(capture)).resolves.toBeUndefined();
  });
});

describe('ToltService.reportConversion — transaction mapping', () => {
  it('stores the Tolt transaction id, the only handle a refund can use', async () => {
    const { service, txRepository } = setup();

    await service.reportConversion(stripeConversion);

    expect(txRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        chargeId: 'in_123',
        userId: USER,
        provider: 'stripe',
        amountCents: 360,
      }),
    );
    expect(txRepository.update).toHaveBeenCalledWith(
      { chargeId: 'in_123' },
      { toltTransactionId: 'txn_1' },
    );
  });

  // The row has to exist before the money-bearing call, not after it. Written
  // afterwards, a failed write would leave a live commission with no local
  // handle: a later refund would find nothing and silently pay it out.
  it('claims the charge before posting the transaction', async () => {
    const order: string[] = [];
    const { service } = setup({
      insert: () => {
        order.push('insert');
        return Promise.resolve(undefined);
      },
      createTransaction: () => {
        order.push('createTransaction');
        return Promise.resolve({ id: 'txn_1' });
      },
    });

    await service.reportConversion(stripeConversion);

    expect(order).toEqual(['insert', 'createTransaction']);
  });

  // The primary key does the arbitrating: whoever inserts first reports, the
  // loser stops. Two deliveries racing past the read-side guard would otherwise
  // both post and pay the partner twice.
  it('does not post when a concurrent delivery already claimed the charge', async () => {
    const { service, client } = setup({
      insert: () => Promise.reject(new Error('duplicate key value violates unique constraint')),
    });

    await service.reportConversion(stripeConversion);

    expect(client.createTransaction).not.toHaveBeenCalled();
  });

  // Deliberately left behind: the transaction may have reached Tolt and only
  // the response been lost, so the claim stands as an at-most-once guarantee
  // and as the record an operator needs to reconcile by hand.
  it('keeps the claim when Tolt rejects the transaction', async () => {
    const { service, txRepository } = setup({
      createTransaction: () => Promise.reject(new ToltApiError('rejected', 400, false)),
    });

    await service.reportConversion(stripeConversion);

    expect(txRepository.insert).toHaveBeenCalled();
    expect(txRepository.update).not.toHaveBeenCalled();
  });

  it('does not report a charge already reported — the mapping is the guard', async () => {
    const { service, client } = setup({ existingTransaction: { chargeId: 'in_123' } });

    await service.reportConversion(stripeConversion);

    expect(client.createTransaction).not.toHaveBeenCalled();
  });
});

describe('ToltService.reportRefund', () => {
  const mapping = {
    chargeId: 'yk_123',
    toltTransactionId: 'txn_1',
    userId: USER,
    provider: 'yookassa',
    amountCents: 207,
    refundedAt: null,
  };

  it('reverses the commission for the refunded charge', async () => {
    const { service, client } = setup({ existingTransaction: mapping });

    await service.reportRefund({ chargeId: 'yk_123' });

    expect(client.refundTransaction).toHaveBeenCalledWith('txn_1');
  });

  it('stamps the reversal so a redelivered webhook cannot repeat it', async () => {
    const { service, txRepository } = setup({ existingTransaction: mapping });

    await service.reportRefund({ chargeId: 'yk_123' });

    expect(txRepository.update).toHaveBeenCalledWith(
      { chargeId: 'yk_123' },
      expect.objectContaining({ refundedAt: expect.any(Date) }),
    );
  });

  it('ignores a charge that was never reported — nothing to reverse', async () => {
    const { service, client } = setup({ existingTransaction: null });

    await service.reportRefund({ chargeId: 'never_reported' });

    expect(client.refundTransaction).not.toHaveBeenCalled();
  });

  // A claim with no transaction id is a charge whose report never confirmed.
  // Distinct from "never an affiliate sale": there may be a live commission in
  // Tolt that only a human can find, so it must not pass silently.
  it('does not silently pass over a claim whose transaction id was never recorded', async () => {
    const { service, client, txRepository } = setup({
      existingTransaction: { ...mapping, toltTransactionId: null },
    });

    await service.reportRefund({ chargeId: 'yk_123' });

    expect(client.refundTransaction).not.toHaveBeenCalled();
    expect(txRepository.update).not.toHaveBeenCalled();
  });

  it('ignores a repeat refund webhook', async () => {
    const { service, client } = setup({
      existingTransaction: { ...mapping, refundedAt: new Date() },
    });

    await service.reportRefund({ chargeId: 'yk_123' });

    expect(client.refundTransaction).not.toHaveBeenCalled();
  });

  // Tolt's refund takes no amount — it reverses the whole commission. Applying
  // it to a partial refund would claw back more than was actually returned.
  it('leaves the commission alone when only part of the charge was refunded', async () => {
    const { service, client } = setup({ existingTransaction: mapping });

    await service.reportRefund({ chargeId: 'yk_123', isPartial: true });

    expect(client.refundTransaction).not.toHaveBeenCalled();
  });

  it('does not stamp the reversal when Tolt rejects it, so it can be retried', async () => {
    const { service, txRepository } = setup({
      existingTransaction: mapping,
      refundTransaction: () => Promise.reject(new ToltApiError('boom', 500, false)),
    });

    await service.reportRefund({ chargeId: 'yk_123' });

    expect(txRepository.update).not.toHaveBeenCalled();
  });

  it('never throws — a refund webhook must not fail on affiliate bookkeeping', async () => {
    const { service, txRepository } = setup({ existingTransaction: mapping });
    txRepository.findOneBy.mockRejectedValue(new Error('db down'));

    await expect(service.reportRefund({ chargeId: 'yk_123' })).resolves.toBeUndefined();
  });
});
