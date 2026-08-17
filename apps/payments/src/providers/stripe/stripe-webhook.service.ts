import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { SavedPaymentMethod, StripePayment } from '@workspace/database';
import { Payments, WebhookEventEnum } from '@workspace/types';
import type Stripe from 'stripe';
import { Repository } from 'typeorm';
import { PaymentStatusService } from '../../payment-status/payment-status.service';
import { ToltService } from '../../tolt/tolt.service';
import type { StripeInvoicePayload } from './stripe.types';
import {
  customerToId,
  mapEURAmountToMonthsNumber,
  mapToCorrectAmount,
  paymentIntentToId,
  subscriptionToId,
} from './stripe.utils';
import { StripeClientService } from './stripe-client.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly stripeClient: StripeClientService,
    private readonly paymentStatusService: PaymentStatusService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(StripePayment)
    private readonly stripePaymentRepo: Repository<StripePayment>,
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepo: Repository<SavedPaymentMethod>,
    private readonly analyticsClient: AnalyticsClientService,
    private readonly toltService: ToltService,
  ) {}

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoiceSuccess(event);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoiceFailure(event);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const customer = customerToId(session.customer);

    if (session.mode === 'payment' && session.metadata?.purpose === 'extra_device') {
      await this.handleExtraDeviceCheckoutCompleted(session, customer);
      return;
    }

    const subscriptionId = subscriptionToId(session.subscription ?? undefined);
    const result = await this.stripePaymentRepo.update(
      { id: session.id },
      { status: 'completed', stripeSubscriptionId: subscriptionId, customer, url: null },
    );

    if (result.affected) {
      this.logger.log(`Checkout completed for session ${session.id} (sub ${subscriptionId})`);
    }
  }

  private async handleExtraDeviceCheckoutCompleted(
    session: Stripe.Checkout.Session,
    customer: string | null,
  ) {
    const userId = session.metadata?.userId;

    if (!userId) {
      this.logger.warn(`Extra-device checkout ${session.id}: no userId in metadata — skipping`);
      return;
    }

    const existing = await this.stripePaymentRepo.findOneBy({ id: session.id });
    if (existing?.status === 'paid' && existing.paidAt !== null) {
      this.logger.log(`Extra-device checkout ${session.id} already processed — ignoring duplicate`);
      return;
    }

    const result = await this.paymentStatusService.handleUserUpdates({
      selectedPeriod: 0,
      userId,
      purpose: 'extra_device',
    });

    await this.stripePaymentRepo.update(
      { id: session.id },
      { status: 'paid', customer: customer ?? undefined, paidAt: new Date(), url: null },
    );

    if (result.success) {
      this.logger.log(`Extra device granted for user ${userId} via session ${session.id}`);
      this.eventEmitter.emit(WebhookEventEnum['payment.succeeded'], {
        userId,
        provider: 'stripe',
        selectedPeriod: 0,
        purpose: 'extra_device',
      } satisfies Payments.PaymentSucceededEventPayload);
    }
  }

  // ── invoice.payment_succeeded ────────────────────────────────────────────
  private async handleInvoiceSuccess(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const payload = await this.buildInvoicePayload(event, true);
    if (!payload) return;

    if (!payload.userId) {
      this.logger.warn(`Stripe invoice ${invoice.id}: no userId on customer metadata — skipping`);
      return;
    }

    // Idempotency: each invoice (initial + every renewal) has a unique id and
    // gets its own DB row. If we already stamped it paid, this is a duplicate
    // webhook (Stripe retries) — ignore so we never extend the subscription twice.
    let record = await this.stripePaymentRepo.findOneBy({ id: invoice.id });
    if (!record) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      record = await this.stripePaymentRepo.findOneBy({ id: invoice.id });
    }

    if (record?.status === 'paid' && record.paidAt !== null) {
      this.logger.log(`Stripe invoice ${invoice.id} already processed — ignoring duplicate`);
      return;
    }

    // Strict amount → period validation (security finding #12) on the success path.
    const selectedPeriod = mapEURAmountToMonthsNumber(invoice.subtotal.toString());

    // Promo rides on the subscription's metadata (set via `subscription_data` at
    // checkout), so it reaches every invoice. Resolve it from the subscription
    // itself — the invoice's own snapshot of subscription metadata isn't reliably
    // populated in the webhook payload. The per-user cap ensures only the first
    // invoice grants the bonus; renewals re-read the code but redeem nothing.
    const subscriptionId = subscriptionToId(invoice.parent?.subscription_details?.subscription);
    let promoCode =
      (invoice.parent?.subscription_details?.metadata as Record<string, string> | undefined)
        ?.promoCode ?? null;
    if (!promoCode && subscriptionId) {
      try {
        const subscription = await this.stripeClient.stripe.subscriptions.retrieve(subscriptionId);
        promoCode = subscription.metadata?.promoCode ?? null;
      } catch (err) {
        this.logger.warn(
          `Promo lookup: could not retrieve subscription ${subscriptionId} for invoice ${invoice.id}: ${err}`,
        );
      }
    }

    // Count prior paid invoices before stamping this one — the current row is
    // still un-stamped at this point, so a count of 0 means first payment.
    const priorPaid = await this.stripePaymentRepo.count({
      where: { userId: payload.userId, status: 'paid' },
    });
    const isFirstPayment = priorPaid === 0;

    // Extend BEFORE writing the idempotency stamp: if remnawave is down this
    // throws, the row stays un-stamped, and Stripe's retry re-enters and tries
    // again — rather than locking the user out of a paid renewal.
    const result = await this.paymentStatusService.handleUserUpdates({
      selectedPeriod,
      userId: payload.userId,
      purpose: record?.purpose,
      promo: { code: promoCode, provider: 'stripe', paymentId: invoice.id },
    });

    await this.persistInvoice(payload, 'paid');

    // Mirror YooKassa: a successful charge against an active subscription is a
    // reusable payment method, so it must surface in saved_payment_methods.
    await this.activatePaymentMethod(payload);

    if (result.success) {
      this.eventEmitter.emit(WebhookEventEnum['payment.succeeded'], {
        userId: payload.userId,
        provider: 'stripe',
        selectedPeriod,
        invoiceUrl: payload.invoiceUrl ?? undefined,
        isFirstPayment,
      } satisfies Payments.PaymentSucceededEventPayload);

      await this.analyticsClient.track({
        event: 'payment_succeeded',
        userId: payload.userId,
        provider: 'stripe',
        selectedPeriod,
        isFirstPayment,
        isAutoPayment: invoice.billing_reason === 'subscription_cycle',
      });

      // Renewals arrive here too — every cycle raises its own invoice — so this
      // covers the recurring commission as well as the first payment.
      // `amount` is nullable on the payload type; without one there is nothing
      // meaningful to report, and a guessed figure would misstate a commission.
      if (payload.amount !== null) {
        await this.toltService.reportConversion({
          userId: payload.userId,
          provider: 'stripe',
          chargeId: invoice.id,
          amount: payload.amount,
          currency: 'EUR',
          periodMonths: selectedPeriod,
          purpose: record?.purpose,
        });
      }
    }
  }

  private async handleInvoiceFailure(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const payload = await this.buildInvoicePayload(event, false);
    if (!payload) return;

    await this.persistInvoice(payload, 'failed');

    this.logger.warn(`Stripe payment failed for user ${payload.userId}, invoice ${invoice.id}`);

    if (!payload.userId) return;

    // Initial checkout failures are shown to the user inline on Stripe's page —
    // only renewal (autopayment) failures warrant a push notification, mirroring
    // YooKassa's "don't notify on first attempt" behavior.
    if (invoice.billing_reason === 'subscription_create') {
      this.logger.log(`Invoice ${invoice.id} failed on initial checkout — skipping notification`);
      return;
    }

    this.eventEmitter.emit(WebhookEventEnum['payment.canceled'], {
      userId: payload.userId,
      provider: 'stripe',
      reason: 'general_decline',
    } satisfies Payments.PaymentFailedEventPayload);

    await this.analyticsClient.track({
      event: 'payment_failed',
      userId: payload.userId,
      provider: 'stripe',
      paymentId: invoice.id,
      reason: 'general_decline',
    });
  }

  // ── charge.refunded ──────────────────────────────────────────────────────
  /**
   * Reverses the affiliate commission when a charge is refunded.
   *
   * Only the affiliate side is touched — revoking subscription time is a
   * separate concern and deliberately not done here.
   *
   * Commissions are keyed by invoice id, but a refund arrives against a charge,
   * and this API version no longer exposes `charge.invoice`. The link runs
   * charge → payment intent → InvoicePayment → invoice, so it costs one lookup.
   * Paid on the refund path rather than on every payment, since refunds are rare.
   */
  private async handleChargeRefunded(event: Stripe.Event) {
    const charge = event.data.object as Stripe.Charge;

    const paymentIntentId = paymentIntentToId(charge.payment_intent);
    if (!paymentIntentId) {
      this.logger.warn(`Refunded charge ${charge.id} has no payment intent — cannot resolve`);
      return;
    }

    const invoiceId = await this.findInvoiceId(paymentIntentId);
    if (!invoiceId) {
      // A charge with no invoice is a one-off purchase (extra device), which
      // never earned a commission in the first place.
      this.logger.log(`Refunded charge ${charge.id} has no invoice — nothing to reverse`);
      return;
    }

    // Stripe reports the running total refunded, so several partial refunds
    // adding up to the full amount are correctly seen as a full refund.
    const isPartial = charge.amount_refunded > 0 && charge.amount_refunded < charge.amount;

    this.logger.log(
      `Charge ${charge.id} refunded ${charge.amount_refunded} of ${charge.amount} — invoice ${invoiceId}`,
    );

    await this.toltService.reportRefund({ chargeId: invoiceId, isPartial });
  }

  /** The invoice a payment intent settled, or null if it was not an invoice payment. */
  private async findInvoiceId(paymentIntentId: string): Promise<string | null> {
    try {
      const payments = await this.stripeClient.stripe.invoicePayments.list({
        payment: { type: 'payment_intent', payment_intent: paymentIntentId },
        limit: 1,
      });

      const invoice = payments.data[0]?.invoice;
      return typeof invoice === 'string' ? invoice : (invoice?.id ?? null);
    } catch (error) {
      this.logger.error(
        `Could not resolve an invoice for payment intent ${paymentIntentId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  // ── customer.subscription.deleted ────────────────────────────────────────
  private async handleSubscriptionDeleted(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const result = await this.stripePaymentRepo.update(
      { stripeSubscriptionId: subscription.id },
      { status: 'canceled' },
    );
    if (result.affected) {
      this.logger.log(`Stripe subscription ${subscription.id} canceled — rows marked`);
    }

    // Keep saved_payment_methods consistent: a deleted subscription is no longer
    // an active method. Scoped to provider='stripe' so YooKassa rows are untouched.
    await this.savedMethodRepo.update(
      { provider: 'stripe', paymentMethodId: subscription.id },
      { isActive: false },
    );
  }

  // ── Saved payment methods ────────────────────────────────────────────────
  // Stripe drives its own renewals, so the saved method exists for parity with
  // YooKassa (display + "has active method" checks), keyed by subscription id.
  //
  // Idempotent: if a row for this subscription already exists, nothing is
  // written. Deactivates any previously active Stripe method for the user first.
  // Errors are swallowed — best-effort, must not block webhook processing.
  private async activatePaymentMethod(payload: StripeInvoicePayload): Promise<void> {
    const { userId, stripeSubscriptionId } = payload;
    if (!userId || !stripeSubscriptionId) return;

    try {
      const existing = await this.savedMethodRepo.findOneBy({
        paymentMethodId: stripeSubscriptionId,
      });
      if (existing) {
        if (!existing.isActive) {
          await this.savedMethodRepo.update({ id: existing.id }, { isActive: true });
        }
        return;
      }

      await this.savedMethodRepo.update(
        { userId, provider: 'stripe', isActive: true },
        { isActive: false },
      );

      const method = this.savedMethodRepo.create({
        userId,
        provider: 'stripe',
        paymentMethodId: stripeSubscriptionId,
        paymentMethodType: 'stripe',
        title: null,
        card: null,
        isActive: true,
      });

      await this.savedMethodRepo.save(method);

      await this.analyticsClient.track({
        event: 'payment_method_saved',
        userId,
        provider: 'stripe',
        paymentId: stripeSubscriptionId,
        methodType: 'stripe',
      });

      this.logger.log(
        `Activated Stripe payment method (sub ${stripeSubscriptionId}) for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to activate Stripe saved method for user ${userId} (sub ${stripeSubscriptionId})`,
        error,
      );
    }
  }

  // ── Persistence (upsert by invoice id) ───────────────────────────────────
  // save() inserts when the primary key is new and updates when it already
  // exists, so the invoice row is created on first delivery and refreshed on
  // any later one without a separate existence check.
  private async persistInvoice(payload: StripeInvoicePayload, status: string): Promise<void> {
    await this.stripePaymentRepo.save(
      this.stripePaymentRepo.create({
        id: payload.id,
        status,
        paidAt: payload.paidAt,
        amount: payload.amount,
        currency: 'EUR',
        userId: payload.userId,
        customer: payload.stripeCustomerId,
        stripeSubscriptionId: payload.stripeSubscriptionId,
        invoiceUrl: payload.invoiceUrl,
        url: null,
      }),
    );
  }

  private async buildInvoicePayload(
    event: Stripe.Event,
    isSuccess: boolean,
  ): Promise<StripeInvoicePayload | null> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = customerToId(invoice.customer);
    const subscriptionId = subscriptionToId(invoice.parent?.subscription_details?.subscription);

    const customer = await this.stripeClient.retrieveCustomer(customerId);
    if (!customer || customer.deleted) return null;

    const amountVal = isSuccess ? invoice.amount_paid : invoice.amount_due;
    const paidAt = isSuccess ? new Date() : null;
    const amount = mapToCorrectAmount(amountVal);
    const fallbackStatus = isSuccess ? 'paid' : 'open';

    return {
      id: invoice.id,
      stripeSubscriptionId: subscriptionId,
      status: invoice.status || fallbackStatus,
      amount,
      stripeCustomerId: customer.id,
      invoiceUrl: invoice.hosted_invoice_url || null,
      metadata: { ...customer.metadata },
      // Remnawave uuid, stamped onto the customer at creation time.
      userId: customer.metadata.userId || null,
      currency: 'EUR',
      paidAt,
      url: null,
    };
  }
}
