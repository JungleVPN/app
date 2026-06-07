import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { StripePayment } from '@workspace/database';
import { Payments, WebhookEventEnum } from '@workspace/types';
import type Stripe from 'stripe';
import { Repository } from 'typeorm';
import { PaymentStatusService } from '../../payment-status/payment-status.service';
import { StripeProvider } from './stripe.provider';
import type { StripeInvoicePayload } from './stripe.types';
import {
  customerToId,
  mapEURAmountToMonthsNumber,
  mapToCorrectAmount,
  subscriptionToId,
} from './stripe.utils';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @Inject(forwardRef(() => StripeProvider))
    private readonly stripeProvider: StripeProvider,
    private readonly paymentStatusService: PaymentStatusService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(StripePayment)
    private readonly stripePaymentRepo: Repository<StripePayment>,
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
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  // ── checkout.session.completed ───────────────────────────────────────────
  // Links the subscription/customer back onto the pending row created at
  // session creation (StripePayment.id === checkout session id).
  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = subscriptionToId(session.subscription ?? undefined);
    const customer = customerToId(session.customer);

    const result = await this.stripePaymentRepo.update(
      { id: session.id },
      { status: 'completed', stripeSubscriptionId: subscriptionId, customer, url: null },
    );

    if (result.affected) {
      this.logger.log(`Checkout completed for session ${session.id} (sub ${subscriptionId})`);
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
    const existing = await this.stripePaymentRepo.findOneBy({ id: invoice.id });
    if (existing?.status === 'paid' && existing.paidAt !== null) {
      this.logger.log(`Stripe invoice ${invoice.id} already processed — ignoring duplicate`);
      return;
    }

    // Strict amount → period validation (security finding #12) on the success path.
    const selectedPeriod = mapEURAmountToMonthsNumber(invoice.amount_paid.toString());

    // Extend BEFORE writing the idempotency stamp: if remnawave is down this
    // throws, the row stays un-stamped, and Stripe's retry re-enters and tries
    // again — rather than locking the user out of a paid renewal.
    const result = await this.paymentStatusService.handleUserUpdates({
      selectedPeriod,
      userId: payload.userId,
    });

    await this.persistInvoice(payload, 'paid');

    if (result.success) {
      this.eventEmitter.emit(WebhookEventEnum['payment.succeeded'], {
        userId: payload.userId,
        provider: 'stripe',
        selectedPeriod,
        invoiceUrl: payload.invoiceUrl ?? undefined,
      } satisfies Payments.PaymentSucceededEventPayload);
    }
  }

  // ── invoice.payment_failed ───────────────────────────────────────────────
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
  }

  // ── Persistence (upsert by invoice id) ───────────────────────────────────
  private async persistInvoice(payload: StripeInvoicePayload, status: string): Promise<void> {
    const fields = {
      status,
      paidAt: payload.paidAt,
      amount: payload.amount,
      currency: 'EUR',
      userId: payload.userId,
      customer: payload.stripeCustomerId,
      stripeSubscriptionId: payload.stripeSubscriptionId,
      invoiceUrl: payload.invoiceUrl,
      url: null,
    };

    const existing = await this.stripePaymentRepo.findOneBy({ id: payload.id });
    if (existing) {
      await this.stripePaymentRepo.update(payload.id, fields);
    } else {
      await this.stripePaymentRepo.save(
        this.stripePaymentRepo.create({ id: payload.id, ...fields }),
      );
    }
  }

  private async buildInvoicePayload(
    event: Stripe.Event,
    isSuccess: boolean,
  ): Promise<StripeInvoicePayload | null> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = customerToId(invoice.customer);
    const subscriptionId = subscriptionToId(invoice.parent?.subscription_details?.subscription);

    const customer = await this.stripeProvider.retrieveCustomer(customerId);
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
