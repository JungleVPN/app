import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import type { StripePayment } from '@workspace/database';
import { WebhookEventEnum } from '@workspace/types';
import type Stripe from 'stripe';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemnaUserResolverService } from '../auth/remna-user-resolver.service';
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

/** The account the webhook creates for a payer who had none. */
const NEW_ACCOUNT_ID = 9001;

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
  let mockUpdateCustomer: any;
  let mockResolveOrCreateByEmail: any;
  let remnaUserResolver: RemnaUserResolverService;

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
    mockUpdateCustomer = vi.fn().mockResolvedValue({});
    stripeClient = {
      retrieveCustomer: mockRetrieveCustomer,
      stripe: {
        subscriptions: { retrieve: mockRetrieveSubscription },
        invoicePayments: { list: mockListInvoicePayments },
        customers: { update: mockUpdateCustomer },
      },
    } as unknown as StripeClientService;

    mockResolveOrCreateByEmail = vi.fn().mockResolvedValue(NEW_ACCOUNT_ID);
    remnaUserResolver = {
      resolveOrCreateByEmail: mockResolveOrCreateByEmail,
      findIdByEmail: vi.fn().mockResolvedValue(null),
    } as unknown as RemnaUserResolverService;

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
      remnaUserResolver,
    );
  });

  afterEach(() => {
    delete process.env.PRICE_EUR_MONTH_1;
    delete process.env.ALLOWED_PERIOD;
  });

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
        purpose: 'subscription',
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

    it('records the purpose and settled amount for analytics', async () => {
      await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

      expect(analyticsClient.track).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'payment_method_saved',
          methodType: 'stripe',
          paymentId: 'sub_1',
          provider: 'stripe',
          userId: 1000,
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

    /**
     * The anonymous checkout page opens a session without creating an account,
     * so the customer reaches the webhook carrying an email rather than a user
     * id. A settled charge is the point the account is earned — before that,
     * anyone who typed an address into the form would have got one free.
     */
    describe('a settled charge for a payer who has no account yet', () => {
      const anonymousCustomer = (metadata: Record<string, string> = {}) => ({
        ...CUSTOMER,
        email: 'payer@test.com',
        metadata: { email: 'payer@test.com', ...metadata },
      });

      beforeEach(() => {
        // The invoice row is already on file and un-stamped, which is what the
        // idempotency check expects — without it the handler waits out its
        // "row not written yet" retry on every one of these cases.
        mockFindOneBy.mockResolvedValue({
          id: 'in_1',
          status: 'open',
          paidAt: null,
          purpose: 'subscription',
        });
      });

      it('creates the account, now that money has actually changed hands', async () => {
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer());

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockResolveOrCreateByEmail).toHaveBeenCalledWith(
          'payer@test.com',
          expect.anything(),
        );
      });

      it('creates it as a global account, per the origin the checkout page carried', async () => {
        // The origin decides RU vs. global and therefore whether a trial is
        // granted at all, and it is unknowable at webhook time except from here.
        mockRetrieveCustomer.mockResolvedValue(
          anonymousCustomer({ signupOrigin: 'https://jungle-vpn.com' }),
        );

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockResolveOrCreateByEmail).toHaveBeenCalledWith(
          'payer@test.com',
          expect.objectContaining({ origin: 'https://jungle-vpn.com' }),
        );
      });

      it('credits the inviter captured before the account existed', async () => {
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer({ inviterId: '1337' }));

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockResolveOrCreateByEmail).toHaveBeenCalledWith(
          'payer@test.com',
          expect.objectContaining({ inviterId: 1337 }),
        );
      });

      it('gives the new account the subscription it just paid for', async () => {
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer());

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockHandleUserUpdates).toHaveBeenCalledWith(
          expect.objectContaining({ userId: NEW_ACCOUNT_ID }),
        );
      });

      it('attributes the payment row to the new account', async () => {
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer());

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({ userId: NEW_ACCOUNT_ID, status: 'paid' }),
        );
      });

      it('stamps the new id onto the Stripe customer, so renewals resolve it directly', async () => {
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer());

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockUpdateCustomer).toHaveBeenCalledWith('cus_1', {
          metadata: { userId: String(NEW_ACCOUNT_ID) },
        });
      });

      it('back-fills the ownerless checkout row left behind at session time', async () => {
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer());

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_1' }), {
          userId: NEW_ACCOUNT_ID,
        });
      });

      it('counts it as a first payment, because the account is brand new', async () => {
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer());

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockEmit).toHaveBeenCalledWith(
          WebhookEventEnum['payment.succeeded'],
          expect.objectContaining({ userId: NEW_ACCOUNT_ID }),
        );
      });

      it('lets Stripe retry when the account could not be created, rather than pocketing the charge', async () => {
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer());
        mockResolveOrCreateByEmail.mockRejectedValue(new Error('panel unreachable'));

        await expect(
          service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded')),
        ).rejects.toThrow('panel unreachable');
        expect(mockSave).not.toHaveBeenCalled();
      });

      it('still fulfils the payment when stamping the customer fails', async () => {
        // The account exists by then; a failed back-fill must not turn a settled
        // charge into a redelivery loop.
        mockRetrieveCustomer.mockResolvedValue(anonymousCustomer());
        mockUpdateCustomer.mockRejectedValue(new Error('stripe hiccup'));

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockHandleUserUpdates).toHaveBeenCalledWith(
          expect.objectContaining({ userId: NEW_ACCOUNT_ID }),
        );
      });

      // The metadata copy is written by `createCustomer` and can simply be
      // absent — a customer made in the dashboard, imported, or predating this
      // flow. The customer's own email field still names the payer.
      it('falls back to the customer email when the metadata copy is missing', async () => {
        mockRetrieveCustomer.mockResolvedValue({
          ...CUSTOMER,
          email: 'payer@test.com',
          metadata: {},
        });

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockResolveOrCreateByEmail).toHaveBeenCalledWith(
          'payer@test.com',
          expect.anything(),
        );
      });

      // A payer can change their address in the Billing Portal, which moves
      // `customer.email` but not the metadata. The captured address is the one
      // the checkout and its analytics were keyed on, so it keeps the account.
      it('prefers the address the checkout captured over a later portal edit', async () => {
        mockRetrieveCustomer.mockResolvedValue({
          ...CUSTOMER,
          email: 'changed@test.com',
          metadata: { email: 'payer@test.com' },
        });

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockResolveOrCreateByEmail).toHaveBeenCalledWith(
          'payer@test.com',
          expect.anything(),
        );
      });

      // Blank is not an address: creating an account on it would leave a paying
      // customer with a login nobody can ever use.
      it('skips a customer whose only address is blank', async () => {
        mockRetrieveCustomer.mockResolvedValue({
          ...CUSTOMER,
          email: '   ',
          metadata: { email: '   ' },
        });

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockResolveOrCreateByEmail).not.toHaveBeenCalled();
        expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      });

      it('skips a customer with neither a user id nor an email to key one on', async () => {
        mockRetrieveCustomer.mockResolvedValue({ ...CUSTOMER, email: null, metadata: {} });

        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockResolveOrCreateByEmail).not.toHaveBeenCalled();
        expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      });

      it('creates nothing for a customer that already names its account', async () => {
        await service.handleWebhook(makeInvoiceEvent('invoice.payment_succeeded'));

        expect(mockResolveOrCreateByEmail).not.toHaveBeenCalled();
        expect(mockHandleUserUpdates).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 1000 }),
        );
      });
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

    // The stored customer id is what getCustomerId reads to recognise a
    // returning payer. Clearing it splits their billing history across two
    // Stripe customers and hides the subscription they already have.
    it('leaves the stored customer alone when the event carries none', async () => {
      await service.handleWebhook(makeCheckoutEvent({ customer: null }));

      const [, changes] = mockUpdate.mock.calls[0];
      expect(changes.customer).toBeUndefined();
      expect(changes.stripeSubscriptionId).toBe('sub_1');
    });

    it('leaves the stored customer alone when the event names a deleted one', async () => {
      await service.handleWebhook(makeCheckoutEvent({ customer: { id: 'cus_1', deleted: true } }));

      const [, changes] = mockUpdate.mock.calls[0];
      expect(changes.customer).toBeUndefined();
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

      // Previously this purchase was completely invisible to PostHog — neither
      // checkout_started nor payment_succeeded ever fired for it.
      it('records the sale for analytics, since a one-off device slot never raises a Stripe invoice', async () => {
        mockFindOneBy.mockResolvedValue({
          id: 'cs_1',
          status: 'pending',
          paidAt: null,
          amount: 5,
        });

        await service.handleWebhook(makeExtraDeviceEvent());

        expect(analyticsClient.track).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'payment_succeeded',
            userId: 1000,
            provider: 'stripe',
            purpose: 'extra_device',
            selectedPeriod: 0,
            amount: '5',
            currency: 'EUR',
          }),
        );
      });

      it('does not report analytics when the device slot was never granted', async () => {
        mockHandleUserUpdates.mockResolvedValue({ success: false });

        await expect(service.handleWebhook(makeExtraDeviceEvent())).rejects.toThrow();

        expect(analyticsClient.track).not.toHaveBeenCalledWith(
          expect.objectContaining({ event: 'payment_succeeded' }),
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

    it('records the refund for analytics, keyed to the invoice’s user', async () => {
      mockFindOneBy.mockResolvedValue({ id: 'in_1', userId: 1000 });

      await service.handleWebhook(makeRefundEvent());

      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'payment_refunded',
        userId: 1000,
        provider: 'stripe',
        isPartial: false,
        amount: '2',
        currency: 'EUR',
      });
    });

    it('does not report analytics when the invoice carries no userId we can attribute it to', async () => {
      mockFindOneBy.mockResolvedValue(null);

      await service.handleWebhook(makeRefundEvent());

      expect(analyticsClient.track).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: 'payment_refunded' }),
      );
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
