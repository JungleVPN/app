import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { PlanService } from '@payments/catalog/plan.service';
import { isReportableCurrency } from '@payments/providers/paddle/paddle.utils';
import { SavedPaymentMethod, WhopPayment, WhopRefund } from '@workspace/database';
import { Payments, WebhookEventEnum } from '@workspace/types';
import { In, Not, Repository } from 'typeorm';
import { RemnaUserResolverService } from '../../auth/remna-user-resolver.service';
import { PaymentStatusService } from '../../payment-status/payment-status.service';
import { ToltService } from '../../tolt/tolt.service';
import {
  type WhopMembershipData,
  WhopMembershipSchema,
  type WhopPaymentData,
  WhopPaymentSchema,
  type WhopRefundData,
  WhopRefundSchema,
  WhopWebhookEnvelopeSchema,
} from './whop.schemas';

/**
 * Status for a payment Whop settled that we could not turn into the thing
 * the customer bought. Mirrors Paddle's: not 'paid', so the idempotency
 * guard leaves the row open for a retry while the stuck charge stays visible.
 */
const UNFULFILLED_STATUS = 'unfulfilled';

/** Transient status of a claimed payment, until it resolves to a terminal one. */
const PROCESSING_STATUS = 'processing';

/**
 * Statuses a payment row can never be claimed out of. Paddle only guards
 * 'paid'/'processing'; 'canceled' is added here so a redelivered success for
 * a membership that has since ended cannot extend the subscription again.
 */
const NON_RECLAIMABLE_STATUSES = ['paid', PROCESSING_STATUS, 'canceled'];

/** Statuses a payment.failed must never overwrite: the money already landed, or is landing. */
const FULFILLED_OR_FULFILLING_STATUSES = ['paid', PROCESSING_STATUS];

/**
 * Membership statuses after which the membership can never bill again.
 * `membership.deactivated` also fires for `past_due`, which Whop may still
 * recover, so that one leaves the saved method in place.
 */
const TERMINAL_MEMBERSHIP_STATUSES: ReadonlySet<string> = new Set([
  'canceled',
  'expired',
  'completed',
]);

/** The `billing_reason` Whop gives an automatic renewal charge. */
const RENEWAL_BILLING_REASON = 'subscription_cycle';

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
 * Thrown when a settled Whop payment could not be fulfilled. Propagates out
 * of the webhook handler so the endpoint answers non-2xx and Whop redelivers.
 */
export class UnfulfilledPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnfulfilledPaymentError';
  }
}

interface WhopPaymentRecord {
  id: string;
  userId: number | null;
  customer: string | null;
  membershipId: string | null;
  amount: number;
  currency: string;
  paidAt: Date | null;
}

@Injectable()
export class WhopWebhookService {
  private readonly logger = new Logger(WhopWebhookService.name);

  constructor(
    private readonly paymentStatusService: PaymentStatusService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(WhopPayment)
    private readonly whopPaymentRepo: Repository<WhopPayment>,
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepo: Repository<SavedPaymentMethod>,
    private readonly analyticsClient: AnalyticsClientService,
    private readonly toltService: ToltService,
    private readonly remnaUserResolver: RemnaUserResolverService,
    private readonly planService: PlanService,
    @InjectRepository(WhopRefund)
    private readonly whopRefundRepo: Repository<WhopRefund>,
  ) {}

  /** Takes the signature-verified, but otherwise untrusted, webhook body. */
  async handleWebhook(body: unknown): Promise<void> {
    const event = WhopWebhookEnvelopeSchema.parse(body);

    switch (event.type) {
      case 'payment.succeeded':
        await this.handlePaymentSucceeded(WhopPaymentSchema.parse(event.data));
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(WhopPaymentSchema.parse(event.data));
        break;
      case 'refund.created':
      case 'refund.updated':
        await this.handleRefund(WhopRefundSchema.parse(event.data));
        break;
      case 'membership.deactivated':
        await this.handleMembershipDeactivated(WhopMembershipSchema.parse(event.data));
        break;
      default:
        this.logger.debug(`Unhandled Whop event: ${event.type}`);
    }
  }

  // ── payment.succeeded ────────────────────────────────────────────────────
  private async handlePaymentSucceeded(payment: WhopPaymentData): Promise<void> {
    if (!(await this.claimPayment(payment.id))) {
      this.logger.log(
        `Whop payment ${payment.id} already processed or in progress — ignoring duplicate delivery`,
      );
      return;
    }

    try {
      await this.processSucceededPayment(payment);
    } catch (error) {
      // Don't leave the row stuck at 'processing', which would block every
      // future retry of this payment (see claimPayment). A no-op when the row
      // already moved to 'unfulfilled' below.
      await this.whopPaymentRepo
        .update({ id: payment.id, status: PROCESSING_STATUS }, { status: UNFULFILLED_STATUS })
        .catch((cleanupError) =>
          this.logger.error(
            `Failed to release stuck claim for Whop payment ${payment.id}`,
            cleanupError,
          ),
        );
      throw error;
    }
  }

  private async processSucceededPayment(payment: WhopPaymentData): Promise<void> {
    // Renewals may not carry the checkout metadata, but always carry the payer.
    const email = (payment.metadata?.email ?? payment.user?.email)?.trim();
    if (!email) {
      throw new Error(`Whop payment ${payment.id} has no payer email`);
    }

    const planId = payment.plan?.id;
    const plan = planId ? await this.planService.findByProviderPriceId('whop', planId) : undefined;
    if (!plan) {
      throw new Error(`Whop payment ${payment.id}: unrecognised plan id ${planId}`);
    }
    const selectedPeriod = plan.billingPeriod;

    const inviterId = payment.metadata?.inviterId ? Number(payment.metadata.inviterId) : undefined;
    const origin = payment.metadata?.signupOrigin ?? null;
    const userId = await this.remnaUserResolver.resolveOrCreate(undefined, email, {
      inviterId,
      origin,
    });

    const amount = payment.total ?? 0;
    const currency = payment.currency.toUpperCase();

    const record: WhopPaymentRecord = {
      id: payment.id,
      userId,
      customer: payment.user?.id ?? null,
      membershipId: payment.membership?.id ?? null,
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
      await this.persistPayment({ ...record, paidAt: null }, UNFULFILLED_STATUS);
      throw new UnfulfilledPaymentError(
        `Whop payment ${payment.id}: subscription was not extended for user ${userId}`,
      );
    }

    await this.persistPayment(record, 'paid');
    await this.activatePaymentMethod(record);

    this.eventEmitter.emit(WebhookEventEnum['payment.succeeded'], {
      userId,
      provider: 'whop',
      selectedPeriod,
    } satisfies Payments.PaymentSucceededEventPayload);

    await this.analyticsClient.track({
      event: 'payment_succeeded',
      userId,
      provider: 'whop',
      purpose: 'subscription',
      selectedPeriod,
      isAutoPayment: payment.billing_reason === RENEWAL_BILLING_REASON,
      amount: String(amount),
      currency,
    });

    if (amount > 0 && isReportableCurrency(currency)) {
      await this.toltService.reportConversion({
        userId,
        provider: 'whop',
        chargeId: payment.id,
        amount,
        currency,
        period: selectedPeriod,
        purpose: 'subscription',
      });
    }
  }

  // ── payment.failed ───────────────────────────────────────────────────────
  private async handlePaymentFailed(payment: WhopPaymentData): Promise<void> {
    // Deliveries can arrive out of order, and a payment id can fail and then
    // succeed on retry. Overwriting a 'paid' row with 'failed' would let a
    // redelivered success claim it again and extend the subscription twice.
    const existing = await this.whopPaymentRepo.findOneBy({ id: payment.id });
    if (existing && FULFILLED_OR_FULFILLING_STATUSES.includes(existing.status)) {
      this.logger.log(
        `Whop payment ${payment.id} is already ${existing.status} — ignoring its failure event`,
      );
      return;
    }

    const email = (payment.metadata?.email ?? payment.user?.email)?.trim();
    // A failed charge is not the moment to create an account for a payer who
    // has none yet — only a settled one earns that (mirrors Paddle).
    const userId = email ? await this.remnaUserResolver.findByEmail(email) : null;

    await this.persistPayment(
      {
        id: payment.id,
        userId,
        customer: payment.user?.id ?? null,
        membershipId: payment.membership?.id ?? null,
        amount: payment.total ?? 0,
        currency: payment.currency.toUpperCase(),
        paidAt: null,
      },
      'failed',
    );

    this.logger.warn(`Whop payment failed: ${payment.id}`);

    if (!userId) return;

    // Initial checkout failures are shown to the payer inline by Whop's own
    // checkout — only a renewal failure warrants a push notification.
    if (payment.billing_reason !== RENEWAL_BILLING_REASON) {
      this.logger.log(
        `Whop payment ${payment.id} failed on initial checkout — skipping notification`,
      );
      return;
    }

    this.eventEmitter.emit(WebhookEventEnum['payment.canceled'], {
      userId,
      provider: 'whop',
      reason: 'general_decline',
    } satisfies Payments.PaymentFailedEventPayload);

    await this.analyticsClient.track({
      event: 'payment_failed',
      userId,
      provider: 'whop',
      paymentId: payment.id,
      reason: 'general_decline',
    });
  }

  // ── membership.deactivated ───────────────────────────────────────────────
  private async handleMembershipDeactivated(membership: WhopMembershipData): Promise<void> {
    if (!TERMINAL_MEMBERSHIP_STATUSES.has(membership.status)) {
      this.logger.log(
        `Whop membership ${membership.id} deactivated as ${membership.status} — may recover, keeping it`,
      );
      return;
    }

    const result = await this.whopPaymentRepo.update(
      { membershipId: membership.id },
      { status: 'canceled' },
    );
    if (result.affected) {
      this.logger.log(`Whop membership ${membership.id} ended — rows marked canceled`);
    }

    // An ended membership can never be charged again, so the saved method is
    // dead weight. Best-effort: a failure here must not stop Whop's retry
    // from re-running this path (mirrors Paddle).
    try {
      const deleted = await this.savedMethodRepo.delete({
        provider: 'whop',
        paymentMethodId: membership.id,
      });
      if (deleted.affected) {
        this.logger.log(`Removed saved Whop payment method for membership ${membership.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete saved Whop method for membership ${membership.id}`,
        error,
      );
    }
  }

  // ── refund.created / refund.updated ──────────────────────────────────────
  /**
   * Reports a refund once it has actually gone through. Whop may create it
   * `pending` and settle it on a later `refund.updated`, and announces it on
   * both events, so the `whop_refunds` insert makes each one count once.
   */
  private async handleRefund(refund: WhopRefundData): Promise<void> {
    if (refund.status !== 'succeeded') return;

    const paymentId = refund.payment?.id;
    const record = paymentId ? await this.whopPaymentRepo.findOneBy({ id: paymentId }) : null;
    if (!paymentId || !record) {
      this.logger.warn(
        `Whop refund ${refund.id} (payment ${paymentId ?? 'unknown'}) has no local payment — cannot attribute`,
      );
      return;
    }

    const currency = refund.currency.toUpperCase();
    if (!(await this.claimRefund({ id: refund.id, paymentId, amount: refund.amount, currency }))) {
      this.logger.log(`Whop refund ${refund.id} already reported — ignoring`);
      return;
    }

    const isPartial = record.amount != null && refund.amount > 0 && refund.amount < record.amount;

    this.logger.log(
      `Whop payment ${paymentId} refunded ${refund.amount} of ${record.amount} — refund ${refund.id}`,
    );

    if (record.userId != null) {
      await this.analyticsClient.track({
        event: 'payment_refunded',
        userId: record.userId,
        provider: 'whop',
        isPartial,
        amount: String(refund.amount),
        currency,
      });
    } else {
      this.logger.warn(`Refunded Whop payment ${paymentId}: no userId to attribute it to`);
    }

    await this.toltService.reportRefund({ chargeId: paymentId, isPartial });
  }

  /** Records a refund as reported; false when an earlier delivery already did. */
  private async claimRefund(refund: {
    id: string;
    paymentId: string;
    amount: number;
    currency: string;
  }): Promise<boolean> {
    try {
      await this.whopRefundRepo.insert(refund);
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  private async activatePaymentMethod(record: WhopPaymentRecord): Promise<void> {
    const { userId, membershipId } = record;
    if (!userId || !membershipId) return;

    try {
      const existing = await this.savedMethodRepo.findOneBy({ paymentMethodId: membershipId });
      if (existing) {
        if (!existing.isActive) {
          await this.savedMethodRepo.update({ id: existing.id }, { isActive: true });
        }
        return;
      }

      await this.savedMethodRepo.update(
        { userId, provider: 'whop', isActive: true },
        { isActive: false },
      );

      await this.savedMethodRepo.save(
        this.savedMethodRepo.create({
          userId,
          provider: 'whop',
          paymentMethodId: membershipId,
          paymentMethodType: 'whop',
          title: null,
          card: null,
          isActive: true,
        }),
      );

      await this.analyticsClient.track({
        event: 'payment_method_saved',
        userId,
        provider: 'whop',
        paymentId: membershipId,
        methodType: 'whop',
      });

      this.logger.log(
        `Activated Whop payment method (membership ${membershipId}) for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to activate Whop saved method for user ${userId} (membership ${membershipId})`,
        error,
      );
    }
  }

  // ── Persistence (upsert by payment id) ───────────────────────────────────
  private async persistPayment(record: WhopPaymentRecord, status: string): Promise<void> {
    await this.whopPaymentRepo.save(this.whopPaymentRepo.create({ ...record, status }));
  }

  /**
   * Atomically claims a payment id for processing, so concurrent or
   * redelivered webhooks for the same payment can't both fulfil it. The
   * primary-key insert is the mutex; on conflict, only a row left in a
   * retryable state ('unfulfilled'/'failed') can be reclaimed. Mirrors
   * Paddle's `claimTransaction`.
   */
  private async claimPayment(paymentId: string): Promise<boolean> {
    try {
      await this.whopPaymentRepo.insert({ id: paymentId, status: PROCESSING_STATUS });
      return true;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }

    const result = await this.whopPaymentRepo.update(
      { id: paymentId, status: Not(In(NON_RECLAIMABLE_STATUSES)) },
      { status: PROCESSING_STATUS },
    );
    return (result.affected ?? 0) > 0;
  }
}
