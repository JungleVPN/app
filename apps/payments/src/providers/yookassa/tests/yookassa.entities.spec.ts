import 'reflect-metadata';
import { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';

/**
 * The two tables the YooKassa provider owns.
 *
 * Column metadata is asserted from TypeORM's own decorator storage rather than
 * a live database: the schema these decorators declare is what migrations are
 * generated from, so a silent change to a type, default or nullability is a
 * production schema change and must fail a test.
 */

type ColumnMetadata = {
  propertyName: string;
  mode: string;
  options: {
    type?: unknown;
    nullable?: boolean;
    default?: unknown;
    unique?: boolean;
    transformer?: unknown;
  };
};

const columnsOf = (entity: Function): Map<string, ColumnMetadata> => {
  const store = getMetadataArgsStorage();
  const columns: ColumnMetadata[] = store.columns.filter((column: any) => column.target === entity);
  return new Map(columns.map((column) => [column.propertyName, column]));
};

const tableNameOf = (entity: Function): string | undefined => {
  const store = getMetadataArgsStorage();
  return store.tables.find((table: any) => table.target === entity)?.name;
};

// ── YookassaPayment ──────────────────────────────────────────────────────────

describe('YookassaPayment entity', () => {
  const columns = columnsOf(YookassaPayment);

  it('maps to the yookassa_payments table', () => {
    expect(tableNameOf(YookassaPayment)).toBe('yookassa_payments');
  });

  // Every column is enumerated so that adding one without a test fails here.
  it('declares exactly the columns the provider reads and writes', () => {
    expect([...columns.keys()].sort()).toEqual([
      'amount',
      'createdAt',
      'currency',
      'description',
      'id',
      'paidAt',
      'promoCode',
      'purpose',
      'selectedPeriod',
      'status',
      'telegramId',
      'updatedAt',
      'url',
      'userId',
    ]);
  });

  // The id is YooKassa's own payment id, so it is assigned by us rather than
  // generated — that is what makes webhook lookups by `object.id` possible.
  it('uses YooKassa’s payment id as the primary key, not a generated one', () => {
    expect(columns.get('id')?.mode).toBe('regular');
    const store = getMetadataArgsStorage();
    const isPrimary = store.columns.find(
      (c: any) => c.target === YookassaPayment && c.propertyName === 'id',
    )?.options?.primary;
    expect(isPrimary).toBe(true);
    expect(
      store.generations?.some(
        (g: any) => g.target === YookassaPayment && g.propertyName === 'id',
      ) ?? false,
    ).toBe(false);
  });

  it.each([
    ['userId', 'the owner every fulfilment and refund is attributed to'],
    ['amount', 'the charged value, kept as a string to avoid float drift'],
    ['selectedPeriod', 'the months of subscription this payment buys'],
  ])('requires %s — %s', (column) => {
    expect(columns.get(column)?.options.nullable).toBe(false);
  });

  it('defaults currency to RUB, the only currency YooKassa is used for', () => {
    expect(columns.get('currency')?.options).toMatchObject({ type: 'varchar', default: 'RUB' });
  });

  // A row starts life pending and is moved to succeeded/canceled by the webhook.
  it('defaults status to pending so a fresh session is never mistaken for paid', () => {
    expect(columns.get('status')?.options).toMatchObject({ type: 'varchar', default: 'pending' });
  });

  it('defaults purpose to subscription, the ordinary case', () => {
    expect(columns.get('purpose')?.options).toMatchObject({
      type: 'varchar',
      default: 'subscription',
    });
  });

  // The confirmation URL is cleared once the payment settles or is canceled,
  // so it must accept null.
  it.each([
    ['url', 'cleared once the payment reaches a terminal state'],
    ['description', 'absent when YooKassa echoes none back'],
    ['telegramId', 'absent for web checkouts with no Telegram identity'],
    ['promoCode', 'absent when no promo was applied'],
    ['paidAt', 'unstamped until fulfilment has actually happened'],
  ])('allows %s to be null — %s', (column) => {
    expect(columns.get(column)?.options.nullable).toBe(true);
  });

  it('stores telegramId as a bigint, which exceeds a 32-bit integer', () => {
    expect(columns.get('telegramId')?.options.type).toBe('bigint');
  });

  // Postgres returns bigint as a string; without the transformer, telegramId
  // would arrive as '42' and every strict comparison against a number fails.
  it('reads telegramId back as a number via the bigint transformer', () => {
    const transformer = columns.get('telegramId')?.options.transformer as {
      to: (value: number) => unknown;
      from: (value: string | null) => number | null;
    };

    expect(transformer.from('42')).toBe(42);
    expect(transformer.from(null)).toBeNull();
    expect(transformer.to(42)).toBe(42);
  });

  it('preserves a Telegram id too large for a 32-bit column', () => {
    const transformer = columns.get('telegramId')?.options.transformer as {
      from: (value: string) => number;
    };

    expect(transformer.from('7999999999')).toBe(7_999_999_999);
  });

  it.each([
    ['createdAt', 'timestamptz'],
    ['updatedAt', 'timestamptz'],
    ['paidAt', 'timestamptz'],
  ])('stores %s with a timezone', (column, type) => {
    expect(columns.get(column)?.options.type).toBe(type);
  });

  it('stamps createdAt and updatedAt automatically', () => {
    expect(columns.get('createdAt')?.mode).toBe('createDate');
    expect(columns.get('updatedAt')?.mode).toBe('updateDate');
  });

  it('holds a full session record on an instance', () => {
    const payment = new YookassaPayment();
    payment.id = 'pay_1';
    payment.userId = 'user-1';
    payment.amount = '599.00';
    payment.currency = 'RUB';
    payment.status = 'succeeded';
    payment.url = 'https://yookassa.test/pay_1';
    payment.description = 'Jungle VPN';
    payment.selectedPeriod = 3;
    payment.telegramId = 42;
    payment.purpose = 'subscription';
    payment.promoCode = 'WELCOME';
    payment.createdAt = new Date('2026-01-01T00:00:00Z');
    payment.updatedAt = new Date('2026-01-02T00:00:00Z');
    payment.paidAt = new Date('2026-01-02T00:00:00Z');

    expect(payment).toMatchObject({
      id: 'pay_1',
      userId: 'user-1',
      amount: '599.00',
      currency: 'RUB',
      status: 'succeeded',
      url: 'https://yookassa.test/pay_1',
      description: 'Jungle VPN',
      selectedPeriod: 3,
      telegramId: 42,
      purpose: 'subscription',
      promoCode: 'WELCOME',
      paidAt: new Date('2026-01-02T00:00:00Z'),
    });
  });

  it('holds an extra-device record, which buys no subscription months', () => {
    const payment = new YookassaPayment();
    payment.purpose = 'extra_device';
    payment.selectedPeriod = 0;
    payment.telegramId = null;
    payment.promoCode = null;
    payment.url = null;
    payment.description = null;
    payment.paidAt = null;

    expect(payment).toMatchObject({
      purpose: 'extra_device',
      selectedPeriod: 0,
      telegramId: null,
      promoCode: null,
      url: null,
      description: null,
      paidAt: null,
    });
  });
});

// ── SavedPaymentMethod ───────────────────────────────────────────────────────

describe('SavedPaymentMethod entity', () => {
  const columns = columnsOf(SavedPaymentMethod);

  it('maps to the saved_payment_methods table', () => {
    expect(tableNameOf(SavedPaymentMethod)).toBe('saved_payment_methods');
  });

  it('declares exactly the columns the autopayment flow reads and writes', () => {
    expect([...columns.keys()].sort()).toEqual([
      'card',
      'createdAt',
      'id',
      'isActive',
      'paymentMethodId',
      'paymentMethodType',
      'provider',
      'title',
      'updatedAt',
      'userId',
    ]);
  });

  // Unlike a payment, the row has no natural external key, so the database
  // generates a uuid.
  it('generates its own uuid primary key', () => {
    const store = getMetadataArgsStorage();
    const generation = store.generations.find(
      (g: any) => g.target === SavedPaymentMethod && g.propertyName === 'id',
    );

    expect(generation?.strategy).toBe('uuid');
  });

  it.each([['userId'], ['paymentMethodId']])('requires %s', (column) => {
    expect(columns.get(column)?.options.nullable).toBe(false);
  });

  // A user legitimately holds several methods and may re-save the same YooKassa
  // method after deactivating it, so neither column is unique.
  it.each([
    ['userId'],
    ['paymentMethodId'],
  ])('does not make %s unique — a user may hold several rows', (column) => {
    expect(columns.get(column)?.options.unique).toBe(false);
  });

  it('defaults provider to yookassa, the only one that saves methods today', () => {
    expect(columns.get('provider')?.options).toMatchObject({
      type: 'varchar',
      default: 'yookassa',
    });
  });

  it('stores the payment method type as free-form text, not an enum', () => {
    expect(columns.get('paymentMethodType')?.options.type).toBe('varchar');
  });

  it('allows a null title, which YooKassa does not always return', () => {
    expect(columns.get('title')?.options).toMatchObject({ type: 'varchar', nullable: true });
  });

  // Card details only exist for bank_card methods; sbp and yoo_money have none.
  it('stores card details as nullable jsonb', () => {
    expect(columns.get('card')?.options).toMatchObject({ type: 'jsonb', nullable: true });
  });

  // Deactivation is a flag rather than a delete so the history of which method
  // paid which charge survives.
  it('defaults isActive to true', () => {
    expect(columns.get('isActive')?.options).toMatchObject({ type: 'boolean', default: true });
  });

  it.each([
    ['createdAt', 'createDate'],
    ['updatedAt', 'updateDate'],
  ])('stamps %s automatically with a timezone', (column, mode) => {
    expect(columns.get(column)?.mode).toBe(mode);
    expect(columns.get(column)?.options.type).toBe('timestamptz');
  });

  it('holds a full bank-card method on an instance', () => {
    const method = new SavedPaymentMethod();
    method.id = 'sm-1';
    method.userId = 'user-1';
    method.provider = 'yookassa';
    method.paymentMethodId = 'pm_1';
    method.paymentMethodType = 'bank_card';
    method.title = 'Bank card *4444';
    method.card = {
      last4: '4444',
      expiryMonth: '12',
      expiryYear: '2030',
      cardType: 'MasterCard',
      first6: '555555',
      issuerCountry: 'RU',
    };
    method.isActive = true;
    method.createdAt = new Date('2026-01-01T00:00:00Z');
    method.updatedAt = new Date('2026-01-01T00:00:00Z');

    expect(method).toMatchObject({
      id: 'sm-1',
      userId: 'user-1',
      provider: 'yookassa',
      paymentMethodId: 'pm_1',
      paymentMethodType: 'bank_card',
      title: 'Bank card *4444',
      card: {
        last4: '4444',
        expiryMonth: '12',
        expiryYear: '2030',
        cardType: 'MasterCard',
        first6: '555555',
        issuerCountry: 'RU',
      },
      isActive: true,
    });
  });

  it('holds a deactivated non-card method with no card details', () => {
    const method = new SavedPaymentMethod();
    method.paymentMethodType = 'sbp';
    method.title = null;
    method.card = null;
    method.isActive = false;

    expect(method).toMatchObject({
      paymentMethodType: 'sbp',
      title: null,
      card: null,
      isActive: false,
    });
  });

  // Every card sub-field is optional: YooKassa omits issuer data for some BINs.
  it('accepts a partially populated card payload', () => {
    const method = new SavedPaymentMethod();
    method.card = { last4: '1234' };

    expect(method.card).toEqual({ last4: '1234' });
  });
});
