import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { AutopaymentService } from '@payments/providers/yookassa/autopayment/autopayment.service';
import type { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import type { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { RemnawebhookPayload, WebhookEventEnum } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@workspace/database', () => ({
  SavedPaymentMethod: class {},
  YookassaPayment: class {},
  Promo: class {},
  PromoRedemption: class {},
}));

// ── Helpers ──────────────────────────────────────────────────────────

const makePayload = (telegramId?: number | null, event = 'user.expires_in_24_hours') =>
  ({
    scope: 'user',
    event,
    data: {
      id: 1000,
      username: 'test',
      status: 'ACTIVE',
      telegramId: telegramId === undefined ? null : telegramId,
    },
    timestamp: new Date(),
    meta: null,
  }) as unknown as RemnawebhookPayload;

describe('AutopaymentService', () => {
  let service: AutopaymentService;

  let savedMethodRepo: Repository<SavedPaymentMethod>;
  let yookassaPaymentRepo: Repository<YookassaPayment>;
  let yookassaProvider: YooKassaProvider;
  let eventEmitter: EventEmitter2;

  let mockSmFindOneBy: ReturnType<typeof vi.fn>;
  let mockYkFindOne: ReturnType<typeof vi.fn>;
  let mockYkCreate: ReturnType<typeof vi.fn>;
  let mockYkSave: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockEmit: ReturnType<typeof vi.fn>;
  let analyticsClient: AnalyticsClientService;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.ALLOWED_PERIOD = '1';
    process.env.PRICE_RUB_MONTH_1 = '200';
    process.env.BOT_URL = 'http://bot:7080';
    process.env.BOT_NOTIFY_SECRET = 'secret';
    process.env.PAYMENT_DESCRIPTION = 'Test payment';

    mockSmFindOneBy = vi.fn();
    savedMethodRepo = {
      findOneBy: mockSmFindOneBy,
    } as unknown as Repository<SavedPaymentMethod>;

    mockYkFindOne = vi.fn().mockResolvedValue({
      selectedPeriod: 1,
      paymentMethodId: 'pm_1',
      amount: '200',
    });
    mockYkCreate = vi.fn((data: any) => data);
    mockYkSave = vi.fn(async (v: any) => v);
    yookassaPaymentRepo = {
      findOne: mockYkFindOne,
      create: mockYkCreate,
      save: mockYkSave,
    } as unknown as Repository<YookassaPayment>;

    mockCreate = vi.fn();
    yookassaProvider = {
      create: mockCreate,
    } as unknown as YooKassaProvider;

    mockEmit = vi.fn();
    eventEmitter = { emit: mockEmit } as unknown as EventEmitter2;

    analyticsClient = {
      track: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsClientService;

    service = new AutopaymentService(
      savedMethodRepo,
      yookassaPaymentRepo,
      yookassaProvider,
      eventEmitter,
      analyticsClient,
    );

    // Stub delay to make tests fast
    vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.ALLOWED_PERIOD;
    delete process.env.PRICE_RUB_MONTH_1;
    delete process.env.BOT_URL;
    delete process.env.BOT_NOTIFY_SECRET;
    delete process.env.PAYMENT_DESCRIPTION;
  });

  // ── Entry point: init ────────────────────────────

  describe('init', () => {
    it('Doesnt skip when payload has no telegramId', async () => {
      await service.init(makePayload(undefined));

      expect(mockSmFindOneBy).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalled();
    });

    it('notifies bot for manual payment when no saved method exists', async () => {
      mockSmFindOneBy.mockResolvedValue(null);

      await service.init(makePayload(42));

      expect(mockSmFindOneBy).toHaveBeenCalledWith({
        userId: 1000,
        isActive: true,
      });
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.no_active_method'],
        expect.objectContaining({
          userId: 1000,
          provider: 'yookassa',
          reason: 'no_active_method',
        }),
      );
    });

    it('attempts autopayment when saved method exists', async () => {
      mockSmFindOneBy.mockResolvedValue({
        userId: 1001,
        paymentMethodId: 'pm_1',
        isActive: true,
      });
      mockCreate.mockResolvedValue({
        id: 'pay_1',
        status: 'succeeded',
        amount: { value: '200', currency: 'RUB' },
      });

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('records the start of the autopayment attempt for analytics', async () => {
      mockSmFindOneBy.mockResolvedValue({
        userId: 1000,
        paymentMethodId: 'pm_1',
        isActive: true,
      });
      mockCreate.mockResolvedValue({
        id: 'pay_1',
        status: 'succeeded',
        amount: { value: '200', currency: 'RUB' },
      });

      await service.init(makePayload(42));

      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'autopayment_initiated',
        userId: 1000,
        provider: 'yookassa',
      });
    });

    it('does not record autopayment_initiated when there is no saved method to charge', async () => {
      mockSmFindOneBy.mockResolvedValue(null);

      await service.init(makePayload(42));

      expect(analyticsClient.track).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: 'autopayment_initiated' }),
      );
    });
  });

  // ── Retry logic ────────────────────────────────────────────────────

  describe('retry logic', () => {
    beforeEach(() => {
      mockSmFindOneBy.mockResolvedValue({
        userId: 1001,
        paymentMethodId: 'pm_1',
        isActive: true,
      });
    });

    it('stops on first success — no retries', async () => {
      mockCreate.mockResolvedValue({
        id: 'pay_1',
        status: 'succeeded',
        amount: { value: '200', currency: 'RUB' },
      });

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('emits payment.insufficient_funds after all retries fail with insufficient_funds', async () => {
      mockCreate.mockResolvedValue({
        id: 'pay_x',
        status: 'canceled',
        cancellation_details: { reason: 'insufficient_funds', party: 'payment_network' },
      });

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.insufficient_funds'],
        expect.objectContaining({ userId: 1000, reason: 'insufficient_funds' }),
      );
    });

    it('emits payment.general_decline after all retries fail with general_decline', async () => {
      mockCreate.mockResolvedValue({
        id: 'pay_x',
        status: 'canceled',
        cancellation_details: { reason: 'general_decline', party: 'payment_network' },
      });

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.general_decline'],
        expect.objectContaining({ userId: 1000, reason: 'general_decline' }),
      );
    });

    it('emits autopayment_exhausted for permanent failures', async () => {
      mockCreate.mockResolvedValue({
        id: 'pay_x',
        status: 'canceled',
        cancellation_details: { reason: 'payment_method_restricted', party: 'payment_network' },
      });

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.autopayment_exhausted'],
        expect.objectContaining({ userId: 1000, reason: 'payment_method_restricted' }),
      );
    });

    it('retries up to 3 times on network error, then notifies bot', async () => {
      mockCreate.mockRejectedValue(new Error('network timeout'));

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockEmit).toHaveBeenCalledWith(
        'payment.autopayment_exhausted',
        expect.objectContaining({ userId: 1000, provider: 'yookassa' }),
      );
    });

    it('succeeds on second attempt after first failure — no notification sent', async () => {
      mockCreate
        .mockResolvedValueOnce({
          id: 'pay_fail',
          status: 'canceled',
          cancellation_details: { reason: 'temporary_error', party: 'yoo_kassa' },
          amount: { value: '200', currency: 'RUB' },
        })
        .mockResolvedValueOnce({
          id: 'pay_ok',
          status: 'succeeded',
          amount: { value: '200', currency: 'RUB' },
        });

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  // ── Payment record persistence ─────────────────────────────────────

  describe('payment record persistence', () => {
    beforeEach(() => {
      mockSmFindOneBy.mockResolvedValue({
        userId: 1001,
        paymentMethodId: 'pm_1',
        isActive: true,
      });
    });

    // The charge has settled, but the subscription has not been extended yet —
    // that is the webhook's job, and it uses `paidAt` as its replay guard.
    // Stamping it here would make the renewal look like a duplicate delivery.
    it('persists the record unstamped on success, leaving paidAt for the webhook', async () => {
      mockCreate.mockResolvedValue({
        id: 'pay_1',
        status: 'succeeded',
        amount: { value: '200', currency: 'RUB' },
      });

      await service.init(makePayload(42));

      expect(mockYkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pay_1',
          status: 'succeeded',
          amount: '200',
          userId: 1000,
          selectedPeriod: 1,
          telegramId: 42,
          description: 'Test payment',
          paidAt: null,
        }),
      );
      expect(mockYkSave).toHaveBeenCalledTimes(1);
    });

    it('does not persist a record on cancellation — record is saved only on success', async () => {
      mockCreate.mockResolvedValue({
        id: 'pay_c',
        status: 'canceled',
        cancellation_details: { reason: 'insufficient_funds', party: 'payment_network' },
        amount: { value: '200', currency: 'RUB' },
      });

      await service.init(makePayload(42));

      expect(mockYkSave).not.toHaveBeenCalled();
    });
  });

  // ── Bot notification ───────────────────────────────────────────────

  describe('bot notification', () => {
    it('delegates to BotNotificationService with the correct event + payload when no saved method', async () => {
      mockSmFindOneBy.mockResolvedValue(null);

      await service.init(makePayload(42));

      expect(mockEmit).toHaveBeenCalledWith(
        'payment.no_active_method',
        expect.objectContaining({
          userId: 1000,
          provider: 'yookassa',
          reason: 'no_active_method',
        }),
      );
    });
  });

  // ── checkAndNotifyExpiry48h ────────────────────────────────────────

  describe('checkAndNotifyExpiry48h', () => {
    const payload48h = makePayload(42, 'user.expires_in_48_hours');

    // The bot forward itself now lives in BotNotificationService's
    // payment.expiry_reminder listener — this service only has to emit.
    it('emits the expiry_reminder event when user has no saved method', async () => {
      mockSmFindOneBy.mockResolvedValue(null);

      await service.checkAndNotifyExpiry48h(payload48h);

      expect(mockSmFindOneBy).toHaveBeenCalledWith({ userId: 1000, isActive: true });
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.expiry_reminder'],
        expect.objectContaining({ userId: 1000, remnawavePayload: payload48h }),
      );
    });

    it('skips the expiry_reminder event when user has an active saved method', async () => {
      mockSmFindOneBy.mockResolvedValue({
        userId: 1000,
        paymentMethodId: 'pm_1',
        isActive: true,
      });

      await service.checkAndNotifyExpiry48h(payload48h);

      expect(mockSmFindOneBy).toHaveBeenCalledWith({ userId: 1000, isActive: true });
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  // ── Cross-provider guard ───────────────────────────────────────────

  // The lookup is narrowed to yookassa, so a user paying by card through
  // Stripe would otherwise be told they have no saved method and be nagged to
  // pay manually while their Stripe subscription renews normally.
  describe('users saved with another provider', () => {
    it('skips silently when the only active method belongs to another provider', async () => {
      mockSmFindOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: 1000, provider: 'stripe', isActive: true });

      await service.init(makePayload(42));

      expect(mockSmFindOneBy).toHaveBeenNthCalledWith(1, {
        userId: 1000,
        provider: 'yookassa',
        isActive: true,
      });
      expect(mockEmit).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // ── no active payment method ────────────────────────────────────────

  describe('no active payment method', () => {
    beforeEach(() => {
      mockSmFindOneBy.mockResolvedValue(null);
    });

    // The email's payment.no_active_method listener already handles this via
    // the emitted event — emitting a separate expiry_reminder event here as
    // well would double-email the user.
    it('does not emit a 24h expiry_reminder event — the no_active_method event already covers it', async () => {
      await service.init(makePayload(42));

      expect(mockEmit).not.toHaveBeenCalledWith(
        WebhookEventEnum['payment.expiry_reminder'],
        expect.anything(),
      );
    });

    it('does not record an expiry_reminder_sent analytics event', async () => {
      await service.init(makePayload(42));

      expect(analyticsClient.track).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: 'expiry_reminder_sent' }),
      );
    });

    it('emits the no_active_method event without throwing', async () => {
      await expect(service.init(makePayload(42))).resolves.toBeUndefined();

      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.no_active_method'],
        expect.anything(),
      );
    });
  });

  // ── Charge construction ────────────────────────────────────────────

  describe('charging the saved method', () => {
    beforeEach(() => {
      mockSmFindOneBy.mockResolvedValue({
        userId: 1000,
        paymentMethodId: 'pm_1',
        isActive: true,
      });
      mockCreate.mockResolvedValue({
        id: 'pay_1',
        status: 'succeeded',
        amount: { value: '200', currency: 'RUB' },
      });
    });

    // A charge against a stored method carries no `confirmation`: that is what
    // makes it complete without any action from the customer.
    it('charges the stored method for the same amount and period as last time', async () => {
      await service.init(makePayload(42));

      expect(mockYkFindOne).toHaveBeenCalledWith({
        where: { userId: 1000, purpose: 'subscription', status: 'succeeded' },
        order: { createdAt: 'DESC' },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        amount: { value: '200', currency: 'RUB' },
        capture: true,
        payment_method_id: 'pm_1',
        description: 'Test payment',
      });
      expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('confirmation');
    });

    // The renewal price is the configured price of the renewed period, never
    // the amount of the previous row: a device-slot purchase, a promo price or
    // a since-changed price would otherwise be charged forever.
    it('charges the configured price for the renewed period, not the previous amount', async () => {
      mockYkFindOne.mockResolvedValue({ selectedPeriod: 1, amount: '100' });

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: { value: '200', currency: 'RUB' } }),
      );
    });

    // A device-slot purchase or an abandoned checkout says nothing about which
    // plan the customer is on, so neither may seed a renewal.
    it('renews from the last succeeded subscription payment only', async () => {
      await service.init(makePayload(42));

      expect(mockYkFindOne).toHaveBeenCalledWith({
        where: { userId: 1000, purpose: 'subscription', status: 'succeeded' },
        order: { createdAt: 'DESC' },
      });
    });

    // An unpriceable period (a legacy row, or a plan withdrawn from sale) has
    // no defensible charge, so no charge is made.
    it('gives up without charging when the renewed period has no configured price', async () => {
      mockYkFindOne.mockResolvedValue({ selectedPeriod: 0, amount: '100' });

      await service.init(makePayload(42));

      expect(mockCreate).not.toHaveBeenCalled();
      // Nothing is retried: a config gap cannot resolve itself between attempts.
      expect(service['delay']).not.toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.autopayment_exhausted'],
        expect.objectContaining({ userId: 1000, reason: 'autopayment_exhausted' }),
      );
    });

    // YooKassa echoes amounts as '200.00'; storing that would make renewal rows
    // read differently from checkout rows for the very same plan.
    it('records the price it charged rather than the provider formatting', async () => {
      mockCreate.mockResolvedValue({
        id: 'pay_1',
        status: 'succeeded',
        amount: { value: '200.00', currency: 'RUB' },
      });

      await service.init(makePayload(42));

      expect(mockYkCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: '200' }));
    });

    it('falls back to a default description when none is configured', async () => {
      delete process.env.PAYMENT_DESCRIPTION;

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Happy to see you in the JUNGLE 🌴' }),
      );
    });

    // Without a previous payment there is no amount or period to renew, so
    // charging would be a guess.
    it('gives up when the user has no previous payment to renew', async () => {
      mockYkFindOne.mockResolvedValue(null);

      await service.init(makePayload(42));

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.autopayment_exhausted'],
        expect.objectContaining({ userId: 1000, reason: 'autopayment_exhausted' }),
      );
    });

    it('reports an exhausted autopayment to analytics', async () => {
      mockCreate.mockResolvedValue({
        id: 'pay_x',
        status: 'canceled',
        cancellation_details: { reason: 'insufficient_funds', party: 'payment_network' },
      });

      await service.init(makePayload(42));

      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'autopayment_failed',
        userId: 1000,
        provider: 'yookassa',
        reason: 'insufficient_funds',
      });
    });

    // YooKassa can leave a charge pending without explaining why; the retry
    // loop must cope with an absent cancellation_details.
    it('retries a non-succeeded charge that carries no cancellation reason', async () => {
      mockCreate.mockResolvedValue({ id: 'pay_p', status: 'pending' });

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.autopayment_exhausted'],
        expect.objectContaining({ reason: 'autopayment_exhausted' }),
      );
    });

    // The last reason wins, so the customer is told why the final attempt
    // failed rather than why an earlier one did.
    it('reports the reason from the last failing attempt', async () => {
      mockCreate
        .mockResolvedValueOnce({
          id: 'pay_1',
          status: 'canceled',
          cancellation_details: { reason: 'general_decline', party: 'payment_network' },
        })
        .mockResolvedValueOnce({ id: 'pay_2', status: 'pending' })
        .mockResolvedValueOnce({
          id: 'pay_3',
          status: 'canceled',
          cancellation_details: { reason: 'insufficient_funds', party: 'payment_network' },
        });

      await service.init(makePayload(42));

      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.insufficient_funds'],
        expect.objectContaining({ reason: 'insufficient_funds' }),
      );
    });

    it('carries a null telegramId through to the persisted record', async () => {
      await service.init(makePayload(null));

      expect(mockYkCreate).toHaveBeenCalledWith(expect.objectContaining({ telegramId: null }));
    });
  });

  // ── Backoff between attempts ───────────────────────────────────────

  // `delay` is stubbed everywhere else to keep the suite fast; this exercises
  // the real timer so the wait between retries is actually verified.
  describe('backoff between attempts', () => {
    it('waits 5 seconds between attempts', async () => {
      vi.restoreAllMocks();
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      mockSmFindOneBy.mockResolvedValue({
        userId: 1000,
        paymentMethodId: 'pm_1',
        isActive: true,
      });
      mockCreate.mockResolvedValue({
        id: 'pay_x',
        status: 'canceled',
        cancellation_details: { reason: 'general_decline', party: 'payment_network' },
      });

      const pending = service.init(makePayload(42));
      await vi.runAllTimersAsync();
      await pending;

      expect(mockCreate).toHaveBeenCalledTimes(3);
      // Two waits for three attempts — none after the last.
      expect(setTimeoutSpy.mock.calls.map(([, ms]) => ms)).toEqual([5_000, 5_000]);

      vi.useRealTimers();
    });
  });

  // ── 48h expiry notifications ───────────────────────────────────────

  describe('checkAndNotifyExpiry48h side effects', () => {
    const payload48h = makePayload(42, 'user.expires_in_48_hours');

    beforeEach(() => {
      mockSmFindOneBy.mockResolvedValue(null);
    });

    // Both the bot forward and the email are handled by their own
    // payment.expiry_reminder listeners — this service only has to emit the
    // event, and hands the raw payload along so the bot listener can forward
    // it unchanged.
    it('emits a 48h expiry_reminder event carrying the raw remnawave payload', async () => {
      await service.checkAndNotifyExpiry48h(payload48h);

      expect(mockEmit).toHaveBeenCalledWith(WebhookEventEnum['payment.expiry_reminder'], {
        userId: 1000,
        provider: 'yookassa',
        hoursRemaining: 48,
        remnawavePayload: payload48h,
      });
    });

    it('records the 48h reminder for analytics', async () => {
      await service.checkAndNotifyExpiry48h(payload48h);

      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'expiry_reminder_sent',
        userId: 1000,
        hoursRemaining: 48,
      });
    });
  });
});
