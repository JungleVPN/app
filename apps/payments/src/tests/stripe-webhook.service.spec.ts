import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import type { StripePayment } from '@workspace/database';
import { WebhookEventEnum } from '@workspace/types';
import type Stripe from 'stripe';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentStatusService } from '../payment-status/payment-status.service';
import { StripeClientService } from '../providers/stripe/stripe-client.service';
import { StripeWebhookService } from '../providers/stripe/stripe-webhook.service';
import type { ToltService } from '../tolt/tolt.service';

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

const CUSTOMER = {
  id: 'cus_1',
  deleted: false,
  metadata: { userId: 1000, email: 'a@b.c' },
} as unknown as Stripe.Customer;

const makeInvoiceEvent = (
  type: 'invoice.payment_succeeded' | 'invoice.payment_failed',
  overrides: Partial<any> = {},
): Stripe.Event =>
  ({
    type,
    data: {
      object: {
        id: 'in_1',
        customer: 'cus_1',
        subtotal: 200,
        amount_paid: 200,
        amount_due: 200,
        status: type === 'invoice.payment_succeeded' ? 'paid' : 'open',
        hosted_invoice_url: 'https://stripe.test/invoice/in_1',
        billing_reason: 'subscription_cycle',
        parent: { subscription_details: { subscription: 'sub_1' } },
        ...overrides,
      },
    },
  }) as unknown as Stripe.Event;

const makeRefundEvent = (overrides: Partial<any> = {}): Stripe.Event =>
  ({
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_1',
        payment_intent: 'pi_1',
        amount: 200,
        amount_refunded: 200,
        refunded: true,
        currency: 'eur',
        ...overrides,
      },
    },
  }) as unknown as Stripe.Event;

const makeCheckoutEvent = (overrides: Partial<any> = {}): Stripe.Event =>
  ({
    type: 'checkout.session.completed',
    data: {
      object: { id: 'cs_1', customer: 'cus_1', subscription: 'sub_1', ...overrides },
    },
  }) as unknown as Stripe.Event;

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;
  let stripeClient: StripeClientService;
  let paymentStatusService: PaymentStatusService;
  let eventEmitter: EventEmitter2;
  let repo: Repository<StripePayment>;

  let mockFindOneBy: any;
  let mockUpdate: any;
  let mockSave: any;
  let mockCreate: any;
  let mockHandleUserUpdates: any;
  let mockEmit: any;
  let mockRetrieveCustomer: any;
  let mockRetrieveSubscription: any;

  let savedMethodRepo: Repository<any>;
  let mockSavedFindOneBy: any;
  let mockSavedUpdate: any;
  let mockSavedDelete: any;
  let mockSavedSave: any;
  let mockSavedCreate: any;
  let analyticsClient: AnalyticsClientService;
  let mockReportConversion: any;
  let mockReportRefund: any;
  let mockListInvoicePayments: any;
  let toltService: ToltService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_PERIOD = '1';
    process.env.PRICE_EUR_MONTH_1 = '2';

    mockFindOneBy = vi.fn().mockResolvedValue(null);
    mockUpdate = vi.fn().mockResolvedValue({ affected: 1 });
    mockSave = vi.fn(async (v: any) => v);
    mockCreate = vi.fn((data: any) => data);
    repo = {
      findOneBy: mockFindOneBy,
      update: mockUpdate,
      save: mockSave,
      create: mockCreate,
      count: vi.fn().mockResolvedValue(0),
    } as unknown as Repository<StripePayment>;

    mockRetrieveCustomer = vi.fn().mockResolvedValue(CUSTOMER);
    mockRetrieveSubscription = vi.fn().mockResolvedValue({ id: 'sub_1', metadata: {} });
    // Stripe removed charge.invoice; the invoice is reached via InvoicePayments.
    mockListInvoicePayments = vi.fn().mockResolvedValue({ data: [{ invoice: 'in_1' }] });
    stripeClient = {
      retrieveCustomer: mockRetrieveCustomer,
      stripe: {
        subscriptions: { retrieve: mockRetrieveSubscription },
        invoicePayments: { list: mockListInvoicePayments },
      },
    } as unknown as StripeClientService;

    mockHandleUserUpdates = vi.fn().mockResolvedValue({ success: true });
    paymentStatusService = {
      handleUserUpdates: mockHandleUserUpdates,
    } as unknown as PaymentStatusService;

    mockEmit = vi.fn();
    eventEmitter = { emit: mockEmit } as unknown as EventEmitter2;

    mockSavedFindOneBy = vi.fn().mockResolvedValue(null);
    mockSavedUpdate = vi.fn().mockResolvedValue({ affected: 0 });
    mockSavedDelete = vi.fn().mockResolvedValue({ affected: 1 });
    mockSavedSave = vi.fn(async (v: any) => v);
    mockSavedCreate = vi.fn((data: any) => data);
    savedMethodRepo = {
      findOneBy: mockSavedFindOneBy,
      update: mockSavedUpdate,
      delete: mockSavedDelete,
      save: mockSavedSave,
      create: mockSavedCreate,
    } as unknown as Repository<any>;

    analyticsClient = {
      track: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsClientService;

    mockReportConversion = vi.fn().mockResolvedValue(undefined);
    mockReportRefund = vi.fn().mockResolvedValue(undefined);
    toltService = {
      reportConversion: mockReportConversion,
      reportRefund: mockReportRefund,
    } as unknown as ToltService;

    service = new StripeWebhookService(
      stripeClient,
      paymentStatusService,
      eventEmitter,
      repo,
      savedMethodRepo,
      analyticsClient,
      toltService,
    );
  });

  afterEach(() => {
    delete process.env.PRICE_EUR_MONTH_1;
    delete process.env.ALLOWED_PERIOD;
  });

  // This is the only reporter of Stripe charges. Tolt's native Stripe
  // integration reports the same charges, so it must stay disconnected in the
  // dashboard — otherwise every partner is credited twice.
  describe('affiliate reporting', () => {
    it('reports the settled invoice', async () => {
      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockReportConversion).toHaveBeenCalledWith({
        userId: 1000,
        provider: 'stripe',
        chargeId: 'in_1',
        // amount_paid is 200 cents; the service reports major units.
        amount: 2,
        currency: 'EUR',
        periodMonths: 1,
        purpose: undefined,
      });
    });

    it('does not report when fulfilment failed', async () => {
      mockHandleUserUpdates.mockResolvedValue({ success: false });

      await expect(
        service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded')),
      ).rejects.toThrow();

      expect(mockReportConversion).not.toHaveBeenCalled();
    });

    it('does not report a redelivered invoice, which would pay the partner twice', async () => {
      mockFindOneBy.mockResolvedValue({ id: 'in_1', status: 'paid', paidAt: new Date() });

      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockReportConversion).not.toHaveBeenCalled();
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('extends subscription, persists the invoice paid, and emits payment.succeeded', async () => {
      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockHandleUserUpdates).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedPeriod: 1,
          userId: 1000,
          promo: { code: null, provider: 'stripe', paymentId: 'in_1' },
        }),
      );
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'in_1', status: 'paid', userId: 1000 }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.objectContaining({ userId: 1000, provider: 'stripe', selectedPeriod: 1 }),
      );
    });

    it('passes the promo code from the subscription metadata to fulfillment', async () => {
      // Promo lives on the subscription (set via subscription_data at checkout),
      // not on the invoice's own snapshot — must be resolved by retrieving it.
      mockRetrieveSubscription.mockResolvedValue({ id: 'sub_1', metadata: { promoCode: 'FREE2' } });

      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockRetrieveSubscription).toHaveBeenCalledWith('sub_1');
      expect(mockHandleUserUpdates).toHaveBeenCalledWith(
        expect.objectContaining({
          promo: { code: 'FREE2', provider: 'stripe', paymentId: 'in_1' },
        }),
      );
    });

    it('ignores a duplicate webhook for an already-paid invoice (idempotency)', async () => {
      mockFindOneBy.mockResolvedValue({ id: 'in_1', status: 'paid', paidAt: new Date() });

      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('skips when the customer has no remnawave userId metadata', async () => {
      mockRetrieveCustomer.mockResolvedValue({ ...CUSTOMER, metadata: { email: 'a@b.c' } });

      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('throws on an unrecognised paid amount (security finding #12)', async () => {
      await expect(
        service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded', { subtotal: 99900 })),
      ).rejects.toThrow();
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    it('records the charge but withholds the paid stamp when the extension fails', async () => {
      mockHandleUserUpdates.mockResolvedValue({ success: false });

      // Non-2xx is what asks Stripe to redeliver, and the un-stamped row is what
      // lets the redelivery re-enter instead of being dismissed as a duplicate.
      await expect(
        service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded')),
      ).rejects.toThrow(/in_1/);

      const persisted = mockSave.mock.calls[0][0];
      expect(persisted.status).not.toBe('paid');
      expect(persisted.paidAt).toBeNull();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('re-extends a redelivered invoice that was charged but never granted', async () => {
      mockHandleUserUpdates.mockResolvedValue({ success: false });
      await expect(
        service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded')),
      ).rejects.toThrow();

      mockFindOneBy.mockResolvedValue(mockSave.mock.calls[0][0]);
      mockHandleUserUpdates.mockResolvedValue({ success: true });
      mockHandleUserUpdates.mockClear();

      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockHandleUserUpdates).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.objectContaining({ userId: 1000 }),
      );
    });

    it('persists a Stripe saved payment method keyed by subscription id', async () => {
      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      // Deactivates any prior active Stripe method for the user, scoped to provider.
      expect(mockSavedUpdate).toHaveBeenCalledWith(
        { userId: 1000, provider: 'stripe', isActive: true },
        { isActive: false },
      );
      expect(mockSavedSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1000,
          provider: 'stripe',
          paymentMethodId: 'sub_1',
          paymentMethodType: 'stripe',
          isActive: true,
        }),
      );
    });

    it('does not duplicate a saved method that already exists (idempotency)', async () => {
      mockSavedFindOneBy.mockResolvedValue({ id: 'm1', paymentMethodId: 'sub_1', isActive: true });

      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockSavedSave).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.deleted', () => {
    const makeSubDeletedEvent = (): Stripe.Event =>
      ({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_1' } },
      }) as unknown as Stripe.Event;

    it('deletes the matching Stripe saved method', async () => {
      await service.handleWebhook(makeSubDeletedEvent());

      expect(mockSavedDelete).toHaveBeenCalledWith({
        provider: 'stripe',
        paymentMethodId: 'sub_1',
      });
      expect(mockSavedUpdate).not.toHaveBeenCalledWith(
        { provider: 'stripe', paymentMethodId: 'sub_1' },
        { isActive: false },
      );
    });

    it('marks the subscription rows canceled', async () => {
      await service.handleWebhook(makeSubDeletedEvent());

      expect(mockUpdate).toHaveBeenCalledWith(
        { stripeSubscriptionId: 'sub_1' },
        { status: 'canceled' },
      );
    });

    it('still cancels the payment rows when deleting the saved method fails', async () => {
      mockSavedDelete.mockRejectedValueOnce(new Error('db down'));

      await expect(service.handleWebhook(makeSubDeletedEvent())).resolves.toBeUndefined();

      expect(mockUpdate).toHaveBeenCalledWith(
        { stripeSubscriptionId: 'sub_1' },
        { status: 'canceled' },
      );
    });
  });

  describe('invoice.payment_failed', () => {
    it('persists failure and emits payment.canceled on a renewal failure', async () => {
      await service.handleWebhook(
        makeInvoiceEvent('invoice.payment_failed', { billing_reason: 'subscription_cycle' }),
      );

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'in_1', status: 'failed' }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.canceled'],
        expect.objectContaining({
          userId: 1000,
          provider: 'stripe',
          reason: 'general_decline',
        }),
      );
    });

    it('does not notify on an initial-checkout failure', async () => {
      await service.handleWebhook(
        makeInvoiceEvent('invoice.payment_failed', { billing_reason: 'subscription_create' }),
      );

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('checkout.session.completed', () => {
    it('links the subscription/customer onto the pending session row', async () => {
      await service.handleWebhook(makeCheckoutEvent());

      expect(mockUpdate).toHaveBeenCalledWith(
        { id: 'cs_1' },
        expect.objectContaining({ stripeSubscriptionId: 'sub_1', customer: 'cus_1' }),
      );
    });

    describe('extra device', () => {
      const makeExtraDeviceEvent = () =>
        makeCheckoutEvent({
          mode: 'payment',
          subscription: null,
          metadata: { purpose: 'extra_device', userId: '1000' },
        });

      beforeEach(() => {
        mockFindOneBy.mockResolvedValue({ id: 'cs_1', status: 'pending', paidAt: null });
      });

      it('grants the slot, stamps the session paid, and emits payment.succeeded', async () => {
        await service.handleWebhook(makeExtraDeviceEvent());

        expect(mockHandleUserUpdates).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 1000, purpose: 'extra_device' }),
        );
        expect(mockUpdate).toHaveBeenCalledWith(
          { id: 'cs_1' },
          expect.objectContaining({ status: 'paid' }),
        );
        expect(mockEmit).toHaveBeenCalledWith(
          WebhookEventEnum['payment.succeeded'],
          expect.objectContaining({ userId: 1000, purpose: 'extra_device' }),
        );
      });

      it('withholds the paid stamp when the device slot was never granted', async () => {
        mockHandleUserUpdates.mockResolvedValue({ success: false });

        await expect(service.handleWebhook(makeExtraDeviceEvent())).rejects.toThrow(/cs_1/);

        const [, changes] = mockUpdate.mock.calls[0];
        expect(changes.status).not.toBe('paid');
        expect(changes.paidAt ?? null).toBeNull();
        expect(mockEmit).not.toHaveBeenCalled();
      });

      it('ignores a redelivery of a slot that was already granted', async () => {
        mockFindOneBy.mockResolvedValue({ id: 'cs_1', status: 'paid', paidAt: new Date() });

        await service.handleWebhook(makeExtraDeviceEvent());

        expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      });
    });
  });

  // Our Tolt transactions are keyed by invoice id, but a refund arrives against
  // a charge — and this API version removed `charge.invoice`, so the link has to
  // be resolved through InvoicePayments.
  describe('charge.refunded', () => {
    it('resolves the invoice from the payment intent and reverses the commission', async () => {
      await service.handleWebhook(makeRefundEvent());

      expect(mockListInvoicePayments).toHaveBeenCalledWith(
        expect.objectContaining({
          payment: { type: 'payment_intent', payment_intent: 'pi_1' },
        }),
      );
      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'in_1', isPartial: false });
    });

    it('flags a partial refund so the whole commission is not voided', async () => {
      await service.handleWebhook(makeRefundEvent({ amount_refunded: 50, refunded: false }));

      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'in_1', isPartial: true });
    });

    it('ignores a charge with no invoice — a one-off extra-device purchase', async () => {
      mockListInvoicePayments.mockResolvedValue({ data: [] });

      await service.handleWebhook(makeRefundEvent());

      expect(mockReportRefund).not.toHaveBeenCalled();
    });

    it('ignores a charge that carries no payment intent', async () => {
      await service.handleWebhook(makeRefundEvent({ payment_intent: null }));

      expect(mockListInvoicePayments).not.toHaveBeenCalled();
      expect(mockReportRefund).not.toHaveBeenCalled();
    });

    it('never throws when the invoice lookup fails', async () => {
      mockListInvoicePayments.mockRejectedValue(new Error('stripe down'));

      await expect(service.handleWebhook(makeRefundEvent())).resolves.toBeUndefined();
      expect(mockReportRefund).not.toHaveBeenCalled();
    });
  });
});
