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
  metadata: { userId: 'user-1', email: 'a@b.c' },
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
  let mockSavedSave: any;
  let mockSavedCreate: any;
  let analyticsClient: AnalyticsClientService;
  let mockReportConversion: any;
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
    stripeClient = {
      retrieveCustomer: mockRetrieveCustomer,
      stripe: { subscriptions: { retrieve: mockRetrieveSubscription } },
    } as unknown as StripeClientService;

    mockHandleUserUpdates = vi.fn().mockResolvedValue({ success: true });
    paymentStatusService = {
      handleUserUpdates: mockHandleUserUpdates,
    } as unknown as PaymentStatusService;

    mockEmit = vi.fn();
    eventEmitter = { emit: mockEmit } as unknown as EventEmitter2;

    mockSavedFindOneBy = vi.fn().mockResolvedValue(null);
    mockSavedUpdate = vi.fn().mockResolvedValue({ affected: 0 });
    mockSavedSave = vi.fn(async (v: any) => v);
    mockSavedCreate = vi.fn((data: any) => data);
    savedMethodRepo = {
      findOneBy: mockSavedFindOneBy,
      update: mockSavedUpdate,
      save: mockSavedSave,
      create: mockSavedCreate,
    } as unknown as Repository<any>;

    analyticsClient = {
      track: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsClientService;

    mockReportConversion = vi.fn().mockResolvedValue(undefined);
    toltService = { reportConversion: mockReportConversion } as unknown as ToltService;

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
        userId: 'user-1',
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

      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

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
          userId: 'user-1',
          promo: { code: null, provider: 'stripe', paymentId: 'in_1' },
        }),
      );
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'in_1', status: 'paid', userId: 'user-1' }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.objectContaining({ userId: 'user-1', provider: 'stripe', selectedPeriod: 1 }),
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

    it('does not emit success when the subscription extension fails', async () => {
      mockHandleUserUpdates.mockResolvedValue({ success: false });

      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(mockSave).toHaveBeenCalled(); // still persisted
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('persists a Stripe saved payment method keyed by subscription id', async () => {
      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      // Deactivates any prior active Stripe method for the user, scoped to provider.
      expect(mockSavedUpdate).toHaveBeenCalledWith(
        { userId: 'user-1', provider: 'stripe', isActive: true },
        { isActive: false },
      );
      expect(mockSavedSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
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

    it('deactivates the matching Stripe saved method', async () => {
      await service.handleWebhook(makeSubDeletedEvent());

      expect(mockSavedUpdate).toHaveBeenCalledWith(
        { provider: 'stripe', paymentMethodId: 'sub_1' },
        { isActive: false },
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
          userId: 'user-1',
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
  });
});
