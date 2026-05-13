import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payments, WebhookEventEnum } from '@workspace/types';
import type Stripe from 'stripe';
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
  ) {}

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handleInvoiceSuccess(event);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoiceFailure(event);
        break;
    }
  }

  private async handleInvoiceSuccess(event: Stripe.Event) {
    const payload = await this.buildInvoicePayload(event, true);
    if (!payload) return;

    const telegramId = payload.metadata.telegramId
      ? Number(payload.metadata.telegramId)
      : undefined;
    const selectedPeriod = Number(payload.metadata.selectedPeriod);

    if (!payload.userId) {
      this.logger.warn('No payload.userId in Stripe invoice payload');
      return;
    }

    const result = await this.paymentStatusService.handleUserUpdates({
      selectedPeriod,
      userId: payload.userId,
    });

    if (result.success) {
      this.eventEmitter.emit(WebhookEventEnum['payment.succeeded'], {
        userId: payload.userId,
        provider: 'stripe',
        selectedPeriod,
        invoiceUrl: payload.invoiceUrl ?? undefined,
      } satisfies Payments.PaymentSucceededEventPayload);
    }
  }

  private async handleInvoiceFailure(event: Stripe.Event) {
    const payload = await this.buildInvoicePayload(event, false);
    if (!payload) return;

    this.logger.warn(`Stripe payment failed for user ${payload.userId}, invoice ${payload.id}`);
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
    const monthsToAdd = mapEURAmountToMonthsNumber(amountVal.toString());

    return {
      id: invoice.id,
      stripeSubscriptionId: subscriptionId,
      status: invoice.status || fallbackStatus,
      amount,
      stripeCustomerId: customer.id,
      invoiceUrl: invoice.hosted_invoice_url || null,
      metadata: {
        ...customer.metadata,
        selectedPeriod: monthsToAdd.toString(),
      },
      // Prefer email (web flow); fall back to telegramId (bot flow)
      userId: customer.metadata.email || customer.metadata.telegramId || null,
      currency: 'EUR',
      paidAt,
      url: null,
    };
  }
}
