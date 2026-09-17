import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AdjustmentNotification,
  EventEntity,
  SubscriptionNotification,
  TransactionNotification,
} from '@paddle/paddle-node-sdk';
import { EventName } from '@paddle/paddle-node-sdk';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { PaddlePayment, SavedPaymentMethod } from '@workspace/database';
import { Payments, WebhookEventEnum } from '@workspace/types';
import { In, Not, Repository } from 'typeorm';
import { RemnaUserResolverService } from '../../auth/remna-user-resolver.service';
import { PaymentStatusService } from '../../payment-status/payment-status.service';
import { ToltService } from '../../tolt/tolt.service';
import type { PaddleTransactionPayload } from './paddle.types';
import { isReportableCurrency, priceIdToMonths, toCustomData, toMajorUnits } from './paddle.utils';

/**
 * Status for a transaction Paddle settled that we could not turn into the
 * thing the customer bought. Mirrors Stripe's `UNFULFILLED_STATUS`: not
 * 'paid', so idempotency guards leave the row open for a retry while making
 * the stuck charge visible in payment history.
 */
const UNFULFILLED_STATUS = 'unfulfilled';

/**
 * Transient status a row holds between being claimed and being resolved to
 * a terminal status ('paid'/'unfulfilled'/'failed'). Acts as the "another
 * delivery is already handling this" signal for claimTransaction.
 */
const PROCESSING_STATUS = 'processing';

const POSTGRES_UNIQUE_VIOLATION = '23505';

/** True for the error a unique-constraint conflict raises, however it got wrapped on the way up. */
function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: unknown; driverError?: { code?: unknown } } | null;
  return (
    candidate?.code === POSTGRES_UNIQUE_VIOLATION ||
    candidate?.driverError?.code === POSTGRES_UNIQUE_VIOLATION
  );
}

/**
 * Thrown when a settled Paddle transaction could not be fulfilled. Propagates
 * out of the webhook handler so the endpoint answers non-2xx and Paddle
 * redelivers.
 */
export class UnfulfilledPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnfulfilledPaymentError';
  }
}

@Injectable()
export class PaddleWebhookService {
  private readonly logger = new Logger(PaddleWebhookService.name);

  constructor(
    private readonly paymentStatusService: PaymentStatusService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(PaddlePayment)
    private readonly paddlePaymentRepo: Repository<PaddlePayment>,
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepo: Repository<SavedPaymentMethod>,
    private readonly analyticsClient: AnalyticsClientService,
    private readonly toltService: ToltService,
    private readonly remnaUserResolver: RemnaUserResolverService,
  ) {}

  async handleWebhook(event: EventEntity): Promise<void> {
    switch (event.eventType) {
      case EventName.TransactionCompleted:
        await this.handleTransactionCompleted(event.data as TransactionNotification);
        break;
      case EventName.TransactionPaymentFailed:
        await this.handleTransactionPaymentFailed(event.data as TransactionNotification);
        break;
      case EventName.SubscriptionCanceled:
        await this.handleSubscriptionCanceled(event.data as SubscriptionNotification);
        break;
      case EventName.AdjustmentCreated:
        await this.handleAdjustmentCreated(event.data as AdjustmentNotification);
        break;
      default:
        this.logger.debug(`Unhandled Paddle event: ${event.eventType}`);
    }
  }

  // ── transaction.completed ────────────────────────────────────────────────
  private async handleTransactionCompleted(transaction: TransactionNotification): Promise<void> {
    if (!(await this.claimTransaction(transaction.id))) {
      this.logger.log(
        `Paddle transaction ${transaction.id} already processed or in progress — ignoring duplicate delivery`,
      );
      return;
    }

    try {
      await this.processCompletedTransaction(transaction);
    } catch (error) {
      // Don't leave the row stuck at 'processing': that would permanently
      // block every future retry of this transaction id, since
      // claimTransaction only reclaims rows that aren't already 'paid' or
      // 'processing'. A no-op here (e.g. the row already moved to
      // 'unfulfilled' below) is fine — the WHERE just matches nothing.
      await this.paddlePaymentRepo
        .update({ id: transaction.id, status: PROCESSING_STATUS }, { status: UNFULFILLED_STATUS })
        .catch((cleanupError) =>
          this.logger.error(
            `Failed to release stuck claim for Paddle transaction ${transaction.id}`,
            cleanupError,
          ),
        );
      throw error;
    }
  }

  private async processCompletedTransaction(transaction: TransactionNotification): Promise<void> {
    const customData = toCustomData(transaction.customData);
    const email = customData.email?.trim();
    if (!email) {
      throw new Error(`Paddle transaction ${transaction.id} has no email in custom data`);
    }

    const priceId = transaction.items[0]?.price?.id;
    const selectedPeriod = priceIdToMonths(priceId);
    if (selectedPeriod == null) {
      throw new Error(`Paddle transaction ${transaction.id}: unrecognised price id ${priceId}`);
    }

    const inviterId = customData.inviterId ? Number(customData.inviterId) : undefined;
    const origin = customData.signupOrigin ?? null;
    const userId = await this.remnaUserResolver.resolveOrCreateByEmail(email, {
      inviterId,
      origin,
    });

    const amount = toMajorUnits(
      transaction.details?.totals?.grandTotal ?? transaction.details?.totals?.total,
      transaction.currencyCode,
    );
    const currency = transaction.currencyCode;

    const payload: PaddleTransactionPayload = {
      id: transaction.id,
      userId,
      customer: transaction.customerId,
      subscriptionId: transaction.subscriptionId,
      amount,
      currency,
      paidAt: new Date(),
    };

    const result = await this.paymentStatusService.handleUserUpdates({
      selectedPeriod,
      userId,
      purpose: 'subscription',
    });

    if (!result.success) {
      await this.persistTransaction({ ...payload, paidAt: null }, UNFULFILLED_STATUS);
      throw new UnfulfilledPaymentError(
        `Paddle transaction ${transaction.id}: subscription was not extended for user ${userId}`,
      );
    }

    await this.persistTransaction(payload, 'paid');
    await this.activatePaymentMethod(payload);

    this.eventEmitter.emit(WebhookEventEnum['payment.succeeded'], {
      userId,
      provider: 'paddle',
      selectedPeriod,
    } satisfies Payments.PaymentSucceededEventPayload);

    await this.analyticsClient.track({
      event: 'payment_succeeded',
      userId,
      provider: 'paddle',
      purpose: 'subscription',
      selectedPeriod,
      isAutoPayment: transaction.origin === 'subscription_recurring',
      amount: String(amount),
      currency,
    });

    if (amount > 0 && isReportableCurrency(currency)) {
      await this.toltService.reportConversion({
        userId,
        provider: 'paddle',
        chargeId: transaction.id,
        amount,
        currency,
        periodMonths: selectedPeriod,
        purpose: 'subscription',
      });
    }
  }

  // ── transaction.payment_failed ───────────────────────────────────────────
  private async handleTransactionPaymentFailed(
    transaction: TransactionNotification,
  ): Promise<void> {
    const customData = toCustomData(transaction.customData);
    const email = customData.email?.trim();
    const amount = toMajorUnits(
      transaction.details?.totals?.grandTotal ?? transaction.details?.totals?.total,
      transaction.currencyCode,
    );

    // A failed charge is not the moment to create an account for a payer who
    // has none yet — only a settled one earns that (mirrors Stripe).
    const userId = email ? await this.remnaUserResolver.findByEmail(email) : null;

    await this.persistTransaction(
      {
        id: transaction.id,
        userId,
        customer: transaction.customerId,
        subscriptionId: transaction.subscriptionId,
        amount,
        currency: transaction.currencyCode,
        paidAt: null,
      },
      'failed',
    );

    this.logger.warn(`Paddle payment failed for transaction ${transaction.id}`);

    if (!userId) return;

    // Initial checkout failures are shown to the payer inline by Paddle's own
    // checkout overlay — only a renewal failure warrants a push notification
    // (mirrors Stripe's "don't notify on first attempt" behavior).
    if (transaction.origin !== 'subscription_recurring') {
      this.logger.log(
        `Paddle transaction ${transaction.id} failed on initial checkout — skipping notification`,
      );
      return;
    }

    this.eventEmitter.emit(WebhookEventEnum['payment.canceled'], {
      userId,
      provider: 'paddle',
      reason: 'general_decline',
    } satisfies Payments.PaymentFailedEventPayload);

    await this.analyticsClient.track({
      event: 'payment_failed',
      userId,
      provider: 'paddle',
      paymentId: transaction.id,
      reason: 'general_decline',
    });
  }

  // ── subscription.canceled ────────────────────────────────────────────────
  private async handleSubscriptionCanceled(subscription: SubscriptionNotification): Promise<void> {
    const result = await this.paddlePaymentRepo.update(
      { subscriptionId: subscription.id },
      { status: 'canceled' },
    );
    if (result.affected) {
      this.logger.log(`Paddle subscription ${subscription.id} canceled — rows marked`);
    }

    // A canceled subscription can never be charged again, so the saved method
    // is dead weight. Best-effort: a failure here must not stop Paddle's
    // retry from re-running the cancel path (mirrors Stripe).
    try {
      const deleted = await this.savedMethodRepo.delete({
        provider: 'paddle',
        paymentMethodId: subscription.id,
      });
      if (deleted.affected) {
        this.logger.log(`Removed saved Paddle payment method for subscription ${subscription.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete saved Paddle method for subscription ${subscription.id}`,
        error,
      );
    }
  }

  // ── adjustment.created (refunds) ─────────────────────────────────────────
  private async handleAdjustmentCreated(adjustment: AdjustmentNotification): Promise<void> {
    if (adjustment.action !== 'refund') return;
    if (adjustment.status !== 'approved') return;

    const record = await this.paddlePaymentRepo.findOneBy({ id: adjustment.transactionId });
    if (!record) {
      this.logger.warn(
        `Refunded Paddle transaction ${adjustment.transactionId} has no local record — cannot attribute`,
      );
      return;
    }

    const refundedAmount = toMajorUnits(adjustment.totals.total, adjustment.currencyCode);
    const isPartial = record.amount != null && refundedAmount > 0 && refundedAmount < record.amount;

    this.logger.log(
      `Paddle transaction ${adjustment.transactionId} refunded ${refundedAmount} of ${record.amount} — adjustment ${adjustment.id}`,
    );

    if (record.userId != null) {
      await this.analyticsClient.track({
        event: 'payment_refunded',
        userId: record.userId,
        provider: 'paddle',
        isPartial,
        amount: String(refundedAmount),
        currency: adjustment.currencyCode,
      });
    } else {
      this.logger.warn(
        `Refunded Paddle transaction ${adjustment.transactionId}: no userId to attribute it to`,
      );
    }

    await this.toltService.reportRefund({ chargeId: adjustment.transactionId, isPartial });
  }

  private async activatePaymentMethod(payload: PaddleTransactionPayload): Promise<void> {
    const { userId, subscriptionId } = payload;
    if (!userId || !subscriptionId) return;

    try {
      const existing = await this.savedMethodRepo.findOneBy({
        paymentMethodId: subscriptionId,
      });
      if (existing) {
        if (!existing.isActive) {
          await this.savedMethodRepo.update({ id: existing.id }, { isActive: true });
        }
        return;
      }

      await this.savedMethodRepo.update(
        { userId, provider: 'paddle', isActive: true },
        { isActive: false },
      );

      const method = this.savedMethodRepo.create({
        userId,
        provider: 'paddle',
        paymentMethodId: subscriptionId,
        paymentMethodType: 'paddle',
        title: null,
        card: null,
        isActive: true,
      });

      await this.savedMethodRepo.save(method);

      await this.analyticsClient.track({
        event: 'payment_method_saved',
        userId,
        provider: 'paddle',
        paymentId: subscriptionId,
        methodType: 'paddle',
      });

      this.logger.log(`Activated Paddle payment method (sub ${subscriptionId}) for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to activate Paddle saved method for user ${userId} (sub ${subscriptionId})`,
        error,
      );
    }
  }

  // ── Persistence (upsert by transaction id) ───────────────────────────────
  private async persistTransaction(
    payload: PaddleTransactionPayload,
    status: string,
  ): Promise<void> {
    await this.paddlePaymentRepo.save(
      this.paddlePaymentRepo.create({
        id: payload.id,
        status,
        paidAt: payload.paidAt,
        amount: payload.amount,
        currency: payload.currency,
        userId: payload.userId,
        customer: payload.customer,
        subscriptionId: payload.subscriptionId,
      }),
    );
  }

  /**
   * Atomically claims a transaction id for processing, so two concurrent or
   * redelivered webhooks for the same transaction can't both pass a
   * check-then-act idempotency test before either has persisted anything.
   *
   * The primary-key insert is the mutex: only one caller can create the row,
   * and Postgres serializes that race at the row level instead of us racing
   * a plain SELECT. A second caller hitting the unique-constraint conflict
   * falls back to a conditional update that only succeeds when the existing
   * row is in a non-terminal, non-claimed state — i.e. a genuine retry of a
   * previously 'unfulfilled'/'failed' transaction, not a duplicate delivery
   * of one that's already 'paid' or currently 'processing' elsewhere.
   */
  private async claimTransaction(transactionId: string): Promise<boolean> {
    try {
      await this.paddlePaymentRepo.insert({ id: transactionId, status: PROCESSING_STATUS });
      return true;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }

    const result = await this.paddlePaymentRepo.update(
      { id: transactionId, status: Not(In(['paid', PROCESSING_STATUS])) },
      { status: PROCESSING_STATUS },
    );
    return (result.affected ?? 0) > 0;
  }
}
