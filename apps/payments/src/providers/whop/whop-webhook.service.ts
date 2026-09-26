import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { PlanService } from '@payments/catalog/plan.service';
import { isReportableCurrency } from '@payments/providers/paddle/paddle.utils';
import { SavedPaymentMethod, WhopPayment } from '@workspace/database';
import { Payments, WebhookEventEnum } from '@workspace/types';
import { In, Not, Repository } from 'typeorm';
import { RemnaUserResolverService } from '../../auth/remna-user-resolver.service';
import { PaymentStatusService } from '../../payment-status/payment-status.service';
import { ToltService } from '../../tolt/tolt.service';
import { type WhopPaymentData, WhopPaymentSchema, WhopWebhookEnvelopeSchema } from './whop.schemas';

/**
 * Status for a payment Whop settled that we could not turn into the thing
 * the customer bought. Mirrors Paddle's: not 'paid', so the idempotency
 * guard leaves the row open for a retry while the stuck charge stays visible.
 */
const UNFULFILLED_STATUS = 'unfulfilled';

/** Transient status of a claimed payment, until it resolves to a terminal one. */
const PROCESSING_STATUS = 'processing';

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
  ) {}

  /** Takes the signature-verified, but otherwise untrusted, webhook body. */
  async handleWebhook(body: unknown): Promise<void> {
    const event = WhopWebhookEnvelopeSchema.parse(body);

    switch (event.type) {
      case 'payment.succeeded':
        await this.handlePaymentSucceeded(WhopPaymentSchema.parse(event.data));
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
      { id: paymentId, status: Not(In(['paid', PROCESSING_STATUS])) },
      { status: PROCESSING_STATUS },
    );
    return (result.affected ?? 0) > 0;
  }
}
