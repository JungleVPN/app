import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { AutopaymentService } from '@payments/autopayment/autopayment.service';
import type { EmailNotificationService } from '@payments/notifications/email-notification.service';
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

const mockAxiosPost = vi.fn();
vi.mock('axios', () => ({
  default: { post: (...args: any[]) => mockAxiosPost(...args) },
}));

// ── Helpers ──────────────────────────────────────────────────────────

const makePayload = (telegramId?: number | null, event = 'user.expires_in_24_hours') =>
  ({
    scope: 'user',
    event,
    data: {
      uuid: 'user-1',
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
  let emailNotificationService: EmailNotificationService;
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

    emailNotificationService = {
      notifyExpiry: vi.fn().mockResolvedValue(undefined),
    } as unknown as EmailNotificationService;

    analyticsClient = {
      track: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsClientService;

    service = new AutopaymentService(
      savedMethodRepo,
      yookassaPaymentRepo,
      yookassaProvider,
      eventEmitter,
      emailNotificationService,
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
        userId: 'user-1',
        isActive: true,
      });
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.no_active_method'],
        expect.objectContaining({
          userId: 'user-1',
          provider: 'yookassa',
          reason: 'no_active_method',
        }),
      );
    });

    it('attempts autopayment when saved method exists', async () => {
      mockSmFindOneBy.mockResolvedValue({
        userId: '42',
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
  });

  // ── Retry logic ────────────────────────────────────────────────────

  describe('retry logic', () => {
    beforeEach(() => {
      mockSmFindOneBy.mockResolvedValue({
        userId: '42',
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
        expect.objectContaining({ userId: 'user-1', reason: 'insufficient_funds' }),
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
        expect.objectContaining({ userId: 'user-1', reason: 'general_decline' }),
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
        expect.objectContaining({ userId: 'user-1', reason: 'payment_method_restricted' }),
      );
    });

    it('retries up to 3 times on network error, then notifies bot', async () => {
      mockCreate.mockRejectedValue(new Error('network timeout'));

      await service.init(makePayload(42));

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockEmit).toHaveBeenCalledWith(
        'payment.autopayment_exhausted',
        expect.objectContaining({ userId: 'user-1', provider: 'yookassa' }),
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
        userId: '42',
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
          userId: 'user-1',
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
          userId: 'user-1',
          provider: 'yookassa',
          reason: 'no_active_method',
        }),
      );
    });
  });

  // ── checkAndNotifyExpiry48h ────────────────────────────────────────

  describe('checkAndNotifyExpiry48h', () => {
    const payload48h = makePayload(42, 'user.expires_in_48_hours');

    it('forwards event to bot when user has no saved method', async () => {
      mockSmFindOneBy.mockResolvedValue(null);
      mockAxiosPost.mockResolvedValue({ status: 200 });

      await service.checkAndNotifyExpiry48h(payload48h);

      expect(mockSmFindOneBy).toHaveBeenCalledWith({ userId: 'user-1', isActive: true });
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/notify/user-event'),
        payload48h,
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-bot-secret': expect.any(String) }),
        }),
      );
    });

    it('skips bot notification when user has an active saved method', async () => {
      mockSmFindOneBy.mockResolvedValue({
        userId: 'user-1',
        paymentMethodId: 'pm_1',
        isActive: true,
      });

      await service.checkAndNotifyExpiry48h(payload48h);

      expect(mockSmFindOneBy).toHaveBeenCalledWith({ userId: 'user-1', isActive: true });
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('logs error and does not throw when bot call fails', async () => {
      mockSmFindOneBy.mockResolvedValue(null);
      mockAxiosPost.mockRejectedValue(new Error('network error'));

      await expect(service.checkAndNotifyExpiry48h(payload48h)).resolves.not.toThrow();
    });
  });
});
