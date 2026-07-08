import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailNotificationService } from '@payments/notifications/email-notification.service';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { getConfiguredAmounts } from '@payments/utils/amount';
import { ValidatePaymentRequest } from '@payments/utils/validators';
import { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { apiRoutes, Payments, RemnawebhookPayload, WebhookEventEnum } from '@workspace/types';
import axios from 'axios';
import { Repository } from 'typeorm';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

@Injectable()
export class AutopaymentService {
  private readonly logger = new Logger(AutopaymentService.name);

  constructor(
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepo: Repository<SavedPaymentMethod>,
    @InjectRepository(YookassaPayment)
    private readonly yookassaPaymentRepo: Repository<YookassaPayment>,
    private readonly yookassaProvider: YooKassaProvider,
    private readonly eventEmitter: EventEmitter2,
    private readonly validatePaymentRequest: ValidatePaymentRequest,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  private get botBaseUrl(): string {
    return process.env.PUBLIC_BOT_URL ?? 'http://localhost:7080/bot';
  }

  private get botNotifySecret(): string {
    return process.env.BOT_NOTIFY_SECRET ?? '';
  }

  private get autopaymentAmount(): string {
    // First configured RUB price is the canonical subscription amount.
    return getConfiguredAmounts('RUB')[0] ?? '200';
  }

  private get autopaymentPeriod(): number {
    const raw = process.env.PUBLIC_ALLOWED_PERIOD || '1';
    return Number(raw.split(',')[0].trim());
  }

  async init(payload: RemnawebhookPayload): Promise<void> {
    const userId = payload.data.uuid;
    const telegramId = payload.data.telegramId;

    if (!telegramId) {
      this.logger.warn('user.expires_in_24_hours event with no telegramId, skipping');
      return;
    }

    const savedMethod = await this.savedMethodRepo.findOneBy({
      userId,
      provider: 'yookassa',
      isActive: true,
    });

    if (!savedMethod) {
      const hasOtherMethod = await this.savedMethodRepo.findOneBy({ userId, isActive: true });

      if (hasOtherMethod) {
        this.logger.log(
          `User ${userId} has ${hasOtherMethod.provider} saved method — skipping autopayment`,
        );
        return;
      }

      this.logger.warn(
        `No active saved payment method for user ${telegramId} — notifying bot for manual payment`,
      );

      this.eventEmitter.emit(WebhookEventEnum['payment.no_active_method'], {
        userId,
        provider: 'yookassa',
        reason: 'no_active_method',
      } satisfies Payments.PaymentFailedEventPayload);

      this.emailNotificationService.notifyExpiry(payload.data, 24).catch((err: unknown) => {
        this.logger.error(`Unhandled error in 24h expiry email: ${err}`);
      });
      return;
    }

    await this.attemptAutopaymentWithRetries({
      userId,
      paymentMethodId: savedMethod.paymentMethodId,
      telegramId,
    });
  }

  async checkAndNotifyExpiry48h(payload: RemnawebhookPayload): Promise<void> {
    const userId = payload.data.uuid;

    const savedMethod = await this.savedMethodRepo.findOneBy({ userId, isActive: true });

    if (savedMethod) {
      this.logger.log(`User ${userId} has active autopayment — skipping 48h expiry notification`);
      return;
    }

    await Promise.allSettled([
      axios
        .post(`${this.botBaseUrl}${apiRoutes.bot.notifyUserEvent}`, payload, {
          headers: { 'x-bot-secret': this.botNotifySecret },
          timeout: 10_000,
        })
        .catch((err: any) => {
          this.logger.error(
            `Failed to forward 48h expiry event to bot for user ${userId}: ${err.message}`,
          );
        }),
      this.emailNotificationService.notifyExpiry(payload.data, 48).catch((err: unknown) => {
        this.logger.error(`Unhandled error in 48h expiry email for user ${userId}: ${err}`);
      }),
    ]);
  }

  private async attemptAutopaymentWithRetries({
    telegramId,
    userId,
    paymentMethodId,
  }: {
    userId: string;
    paymentMethodId: string;
    telegramId?: number;
  }): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      this.logger.log(`Autopayment attempt ${attempt}/${MAX_RETRIES} for user ${userId}`);

      try {
        const result = await this.executeAutopayment({ userId, paymentMethodId, telegramId });

        if (result.status === 'succeeded') {
          this.logger.log(`Autopayment succeeded for user ${userId} (attempt ${attempt})`);
          return;
        }

        // Payment processed but failed (e.g. canceled by bank)
        this.logger.warn(
          `Autopayment attempt ${attempt} for user ${userId}: status=${result.status}` +
            (result.cancellation_details ? ` reason=${result.cancellation_details.reason}` : ''),
        );
      } catch (err: any) {
        this.logger.error(
          `Autopayment attempt ${attempt} for user ${userId} failed: ${err.message}`,
        );
      }

      if (attempt < MAX_RETRIES) {
        await this.delay(RETRY_DELAY_MS);
      }
    }

    this.logger.warn(
      `All ${MAX_RETRIES} autopayment attempts failed for user ${telegramId} — falling back to manual payment`,
    );

    this.eventEmitter.emit(WebhookEventEnum['payment.autopayment_exhausted'], {
      userId,
      provider: 'yookassa',
      reason: 'autopayment_exhausted',
    } satisfies Payments.PaymentFailedEventPayload);
  }

  /**
   * Execute a single autopayment attempt.
   * Creates the payment via YooKassa, persists the record, and emits failure events.
   */
  private async executeAutopayment({
    telegramId,
    userId,
    paymentMethodId,
  }: {
    userId: string;
    paymentMethodId: string;
    telegramId?: number;
  }): Promise<Payments.IPayment> {
    const amount = this.autopaymentAmount;
    const selectedPeriod = this.autopaymentPeriod;

    // Validate that the env-configured amount and period are in the allowed set.
    // This catches misconfiguration before any money moves.
    this.validatePaymentRequest.validateAmount(amount);
    this.validatePaymentRequest.validatePeriod(selectedPeriod);
    const description = process.env.PAYMENT_DESCRIPTION || 'Happy to see you in the JUNGLE 🌴';

    const request: Payments.CreatePaymentRequest = {
      amount: { value: String(amount), currency: 'RUB' },
      capture: true,
      payment_method_id: paymentMethodId,
      description,
    };

    const payment = await this.yookassaProvider.create(request);

    const record = this.yookassaPaymentRepo.create({
      id: payment.id,
      status: payment.status,
      amount,
      userId,
      selectedPeriod,
      telegramId: telegramId ?? null,
      description,
      paidAt: null,
    });

    try {
      await this.yookassaPaymentRepo.save(record);
    } catch (dbErr: any) {
      this.logger.error(
        `Failed to persist autopayment record for payment ${payment.id} ` +
          `(userId=${userId}): ${dbErr.message}. ` +
          `The charge was created in YooKassa — subscription extension will rely on the incoming webhook.`,
      );
    }

    if (payment.status === 'canceled' && payment.cancellation_details) {
      throw new Error(`Autopayment failed: ${payment.cancellation_details.reason}`);
    }

    return payment;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
