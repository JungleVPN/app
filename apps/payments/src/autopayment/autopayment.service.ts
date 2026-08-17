import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { EmailNotificationService } from '@payments/notifications/email-notification.service';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
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
    private readonly emailNotificationService: EmailNotificationService,
    private readonly analyticsClient: AnalyticsClientService,
  ) {}

  private get botBaseUrl(): string {
    return process.env.PUBLIC_BOT_URL ?? 'http://localhost:7080/bot';
  }

  private get botNotifySecret(): string {
    return process.env.BOT_NOTIFY_SECRET ?? '';
  }

  async init(payload: RemnawebhookPayload): Promise<void> {
    const userId = payload.data.uuid;
    const telegramId = payload.data.telegramId;

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

      this.eventEmitter.emit(WebhookEventEnum['payment.no_active_method'], {
        userId,
        provider: 'yookassa',
        reason: 'no_active_method',
      } satisfies Payments.PaymentFailedEventPayload);

      this.emailNotificationService.notifyExpiry(payload.data, 24).catch((err: unknown) => {
        this.logger.error(`Unhandled error in 24h expiry email: ${err}`);
      });

      await this.analyticsClient.track({
        event: 'expiry_reminder_sent',
        userId,
        hoursRemaining: 24,
      });
      return;
    }

    const result = await this.attemptAutopaymentWithRetries(savedMethod.paymentMethodId);

    if (result.status === 'error') {
      const eventByReason: Partial<Record<Payments.CancelReason, WebhookEventEnum>> = {
        insufficient_funds: WebhookEventEnum['payment.insufficient_funds'],
        general_decline: WebhookEventEnum['payment.general_decline'],
      };

      const eventName =
        (result.reason && eventByReason[result.reason]) ??
        WebhookEventEnum['payment.autopayment_exhausted'];

      this.eventEmitter.emit(eventName, {
        userId,
        provider: 'yookassa',
        reason: result.reason ?? 'autopayment_exhausted',
      } satisfies Payments.PaymentFailedEventPayload);

      await this.analyticsClient.track({
        event: 'autopayment_failed',
        userId,
        provider: 'yookassa',
        reason: result.reason ?? 'autopayment_exhausted',
      });
      return;
    } else {
      const { payment, selectedPeriod } = result;

      const record = this.yookassaPaymentRepo.create({
        id: payment.id,
        status: payment.status,
        amount: payment.amount.value,
        userId,
        selectedPeriod,
        paymentMethodId: savedMethod.paymentMethodId,
        telegramId,
        description: process.env.PAYMENT_DESCRIPTION,
        // Left unstamped even though YooKassa already reports 'succeeded': the
        // charge has settled but the subscription has not been extended yet.
        // `handlePaymentSucceeded` does that and stamps `paidAt` afterwards, so
        // pre-stamping here would make the webhook mistake the renewal for a
        // replay and skip it — leaving the customer charged but not extended.
        paidAt: null,
      });
      await this.yookassaPaymentRepo.save(record);
    }
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

    await this.analyticsClient.track({ event: 'expiry_reminder_sent', userId, hoursRemaining: 48 });
  }

  private async attemptAutopaymentWithRetries(
    paymentMethodId: string,
  ): Promise<
    | { status: 'success'; reason: undefined; payment: Payments.IPayment; selectedPeriod: number }
    | { status: 'error'; reason: Payments.CancelReason | undefined; payment: null }
  > {
    let lastReason: Payments.CancelReason | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      this.logger.log(
        `Autopayment attempt ${attempt}/${MAX_RETRIES}. PaymentMethodId=${paymentMethodId} `,
      );

      try {
        const { payment, selectedPeriod } = await this.executeAutopayment(paymentMethodId);

        if (payment.status === 'succeeded') {
          this.logger.log(
            `Autopayment succeeded! PaymentMethodId=${paymentMethodId} (attempt ${attempt})`,
          );
          return { status: 'success', reason: undefined, payment, selectedPeriod };
        }

        const reason = payment.cancellation_details?.reason;
        this.logger.warn(
          `Autopayment attempt ${attempt}. PaymentMethodId=${paymentMethodId}. Status=${payment.status}` +
            (reason ? ` reason=${reason}` : ''),
        );

        if (reason) {
          lastReason = reason;
        }
      } catch (err: any) {
        this.logger.error(
          `Autopayment attempt ${attempt} for paymentMethodId=${paymentMethodId} failed: ${err.message}`,
        );
      }

      if (attempt < MAX_RETRIES) {
        await this.delay(RETRY_DELAY_MS);
      }
    }

    this.logger.warn(
      `All ${MAX_RETRIES} autopayment attempts failed for paymentMethodId=${paymentMethodId} — falling back to manual payment`,
    );

    return { status: 'error', reason: lastReason, payment: null };
  }

  private async executeAutopayment(
    paymentMethodId: string,
  ): Promise<{ payment: Payments.IPayment; selectedPeriod: number }> {
    const previousPayment = await this.yookassaPaymentRepo.findOne({
      where: { paymentMethodId },
      order: { createdAt: 'DESC' },
    });

    if (!previousPayment) {
      throw new Error(`No previous payment found for paymentMethodId ${paymentMethodId}`);
    }

    const { selectedPeriod, amount } = previousPayment;
    const description = process.env.PAYMENT_DESCRIPTION || 'Happy to see you in the JUNGLE 🌴';

    const request: Payments.CreatePaymentRequest = {
      amount: { value: amount, currency: 'RUB' },
      capture: true,
      payment_method_id: paymentMethodId,
      description,
    };

    const payment = await this.yookassaProvider.create(request);
    return { payment, selectedPeriod };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
