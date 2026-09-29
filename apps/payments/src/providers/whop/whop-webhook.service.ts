import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { PlanService } from '@payments/catalog/plan.service';
import { isReportableCurrency } from '@payments/providers/paddle/paddle.utils';
import { SavedPaymentMethod, WhopPayment, WhopRefund } from '@workspace/database';
import { Payments, WebhookEventEnum } from '@workspace/types';
import { In, Not, Repository } from 'typeorm';
import type { z } from 'zod';
import { RemnaUserResolverService } from '../../auth/remna-user-resolver.service';
import { PaymentStatusService } from '../../payment-status/payment-status.service';
import { ToltService } from '../../tolt/tolt.service';
import {
  type WhopCancelAtPeriodEndChangedData,
  WhopCancelAtPeriodEndChangedSchema,
  type WhopMembershipData,
  WhopMembershipSchema,
  type WhopPaymentData,
  WhopPaymentSchema,
  type WhopRefundData,
  WhopRefundSchema,
  type WhopWebhookEnvelope,
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

/** The status of a payment whose money Whop has collected. */
const PAID_PAYMENT_STATUS = 'paid';

/** The `billing_reason` Whop gives a one-off purchase, whose membership never renews. */
const ONE_TIME_BILLING_REASON = 'one_time';

/** The `billing_reason` Whop gives an automatic renewal charge. */
const RENEWAL_BILLING_REASON = 'subscription_cycle';

const POSTGRES_UNIQUE_VIOLATION = '23505';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What the profile page shows about a Whop subscription, as of its latest
 * charge. The price is the plan's, not the charge's: a promo that discounts
 * only the first charge must not read as the price every renewal will cost.
 */
type SubscriptionDetails = Pick<
  SavedPaymentMethod,
  'productName' | 'amount' | 'currency' | 'billingPeriod' | 'renewsAt' | 'title' | 'card'
>;

/** Whop's `paid_at` as a Date, taking a number as Unix seconds; now when it is missing. */
function paidAtOf(payment: WhopPaymentData): Date {
  const paidAt = payment.paid_at;
  if (typeof paidAt === 'number') return new Date(paidAt * 1000);
  if (paidAt) return new Date(paidAt);
  return new Date();
}

function cardOf(payment: WhopPaymentData): SavedPaymentMethod['card'] {
  if (!payment.card_last4) return null;
  return {
    last4: payment.card_last4,
    ...(payment.card_brand ? { cardType: payment.card_brand } : {}),
    ...(payment.card_exp_month != null ? { expiryMonth: String(payment.card_exp_month) } : {}),
    ...(payment.card_exp_year != null ? { expiryYear: String(payment.card_exp_year) } : {}),
  };
}

function subscriptionDetailsOf(
  payment: WhopPaymentData,
  charge: { amount: number; currency: string; billingPeriod: number },
): SubscriptionDetails {
  return {
    productName: payment.product?.title ?? null,
    amount: charge.amount,
    currency: charge.currency,
    billingPeriod: charge.billingPeriod,
    renewsAt: new Date(paidAtOf(payment).getTime() + charge.billingPeriod * DAY_MS),
    title: payment.payment_instrument?.display_name ?? null,
    card: cardOf(payment),
  };
}

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
    this.logger.log(`Whop event ${event.type}`);

    switch (event.type) {
      case 'payment.succeeded':
        await this.handlePaymentSucceeded(this.parseData(event, WhopPaymentSchema));
        break;
      case 'payment.created':
        await this.handlePaymentCreated(this.parseData(event, WhopPaymentSchema));
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(this.parseData(event, WhopPaymentSchema));
        break;
      case 'refund.created':
      case 'refund.updated':
        await this.handleRefund(this.parseData(event, WhopRefundSchema));
        break;
      case 'membership.deactivated':
        await this.handleMembershipDeactivated(this.parseData(event, WhopMembershipSchema));
        break;
      case 'membership.cancel_at_period_end_changed':
        await this.handleCancelAtPeriodEndChanged(
          this.parseData(event, WhopCancelAtPeriodEndChangedSchema),
        );
        break;
      default:
        this.logger.debug(`Unhandled Whop event: ${event.type}`);
    }
  }

  /** Whether the webhook has extended the subscription for this payment and recorded it as paid. */
  async isPaymentFulfilled(paymentId: string): Promise<boolean> {
    const payment = await this.whopPaymentRepo.findOneBy({ id: paymentId });
    return payment?.status === 'paid';
  }

  /**
   * Parses an event's data, and when it does not match says which event it
   * was and which fields arrived — names only, since values carry the
   * payer's email — so a payload Whop changed under us is diagnosable from
   * the log alone. Rethrows: the 5xx makes Whop redeliver once it is fixed.
   */
  private parseData<T>(event: WhopWebhookEnvelope, schema: z.ZodType<T>): T {
    const result = schema.safeParse(event.data);
    if (result.success) return result.data;

    const received =
      event.data && typeof event.data === 'object'
        ? Object.keys(event.data).sort().join(', ')
        : typeof event.data;
    const mismatched = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(
      ', ',
    );
    this.logger.error(
      `Whop ${event.type} payload does not match its schema — mismatched: ${mismatched}; received fields: ${received}`,
    );
    throw result.error;
  }

  // ── payment.created ──────────────────────────────────────────────────────
  /**
   * An on-session checkout charges at once, so Whop creates the payment
   * already paid and sends only `payment.created` for it — no
   * `payment.succeeded` follows. A paid one is fulfilled exactly like a
   * success; the claim on the payment id makes it count once whichever of the
   * two events arrives, or if both do. An unpaid one is left for
   * `payment.succeeded`.
   */
  private async handlePaymentCreated(payment: WhopPaymentData): Promise<void> {
    if (payment.status !== PAID_PAYMENT_STATUS) {
      this.logger.log(
        `Whop payment ${payment.id} created as ${payment.status ?? 'unknown'} — awaiting payment.succeeded`,
      );
      return;
    }
    await this.handlePaymentSucceeded(payment);
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
    const planId = payment.plan?.id;
    const plan = planId ? await this.planService.findByProviderPriceId('whop', planId) : undefined;
    if (!plan) {
      throw new Error(`Whop payment ${payment.id}: unrecognised plan id ${planId}`);
    }
    const selectedPeriod = plan.billingPeriod;

    const userId =
      (await this.findMembershipOwner(payment.membership?.id)) ??
      (await this.resolvePayerByEmail(payment));

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

    if (payment.billing_reason !== ONE_TIME_BILLING_REASON) {
      await this.activatePaymentMethod(
        record,
        subscriptionDetailsOf(payment, {
          amount: plan.basePrice,
          currency: plan.currency,
          billingPeriod: selectedPeriod,
        }),
      );
    }

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
  /**
   * The account a membership we already saved belongs to. Whop files a wallet
   * payment under the wallet owner's Whop account, so a renewal's Whop user
   * can differ from the email the buyer checked out with; the saved
   * membership keeps the account that checkout email resolved to.
   */
  private async findMembershipOwner(membershipId: string | undefined): Promise<number | null> {
    if (!membershipId) return null;
    const saved = await this.savedMethodRepo.findOneBy({
      provider: 'whop',
      paymentMethodId: membershipId,
    });
    return saved?.userId ?? null;
  }

  /** The first purchase: the checkout email from the metadata, else Whop's payer email. */
  private async resolvePayerByEmail(payment: WhopPaymentData): Promise<number> {
    const email = (payment.metadata?.email ?? payment.user?.email)?.trim();
    if (!email) {
      throw new Error(`Whop payment ${payment.id} has no payer email`);
    }
    const inviterId = payment.metadata?.inviterId ? Number(payment.metadata.inviterId) : undefined;
    const origin = payment.metadata?.signupOrigin ?? null;
    return this.remnaUserResolver.resolveOrCreate(undefined, email, { inviterId, origin });
  }

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
    const userId =
      (await this.findMembershipOwner(payment.membership?.id)) ??
      (email ? await this.remnaUserResolver.findByEmail(email) : null);

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

    // An ended membership can never be charged again. The row is kept as a
    // record, never deleted. Best-effort: a failure here must not stop Whop's
    // retry from re-running this path (mirrors Paddle).
    try {
      const terminated = await this.savedMethodRepo.update(
        { provider: 'whop', paymentMethodId: membership.id },
        { status: 'terminated', isActive: false },
      );
      if (terminated.affected) {
        this.logger.log(`Terminated saved Whop payment method for membership ${membership.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to terminate saved Whop method for membership ${membership.id}`,
        error,
      );
    }
  }

  // ── membership.cancel_at_period_end_changed ──────────────────────────────
  /**
   * A cancel or resume made anywhere — our profile page, the Whop app, or
   * support. A terminated membership stays terminated: it can never bill again.
   */
  private async handleCancelAtPeriodEndChanged(
    membership: WhopCancelAtPeriodEndChangedData,
  ): Promise<void> {
    const saved = await this.savedMethodRepo.findOneBy({
      provider: 'whop',
      paymentMethodId: membership.id,
    });
    if (!saved || saved.status === 'terminated') return;

    const status = membership.cancel_at_period_end ? 'canceled' : 'active';
    await this.savedMethodRepo.update({ id: saved.id }, { status });
    this.logger.log(`Whop membership ${membership.id} is now ${status}`);
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

  /**
   * Saves the membership as the user's active Whop method, carrying the
   * latest charge's details so the profile page reads them from here.
   */
  private async activatePaymentMethod(
    record: WhopPaymentRecord,
    details: SubscriptionDetails,
  ): Promise<void> {
    const { userId, membershipId } = record;
    if (!userId || !membershipId) return;

    try {
      const existing = await this.savedMethodRepo.findOneBy({ paymentMethodId: membershipId });
      if (existing) {
        await this.savedMethodRepo.update({ id: existing.id }, { ...details, isActive: true });
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
          ...details,
          isActive: true,
          status: 'active',
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
