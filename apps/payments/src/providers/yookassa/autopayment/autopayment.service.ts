import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { getPriceForPeriod } from '@payments/utils/amount';
import { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { Payments, RemnawebhookPayload, UserDto, WebhookEventEnum } from '@workspace/types';
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
    private readonly analyticsClient: AnalyticsClientService,
  ) {}

  async init(payload: RemnawebhookPayload): Promise<void> {
    const userId = payload.data.id;
    const telegramId = payload.data.telegramId;

    const savedMethod = await this.savedMethodRepo.findOneBy({
      userId,
      provider: 'yookassa',
      isActive: true,
    });

    if (!savedMethod) {
      await this.handleUnsavedPaymentMethod(payload.data);
      return;
    }

    await this.analyticsClient.track({
      event: 'autopayment_initiated',
      userId,
      provider: 'yookassa',
    });

    const result = await this.attemptAutopaymentWithRetries(userId, savedMethod.paymentMethodId);

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
      const { payment, selectedPeriod, amount } = result;

      const record = this.yookassaPaymentRepo.create({
        id: payment.id,
        status: payment.status,
        amount,
        userId,
        selectedPeriod,
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

  private async handleUnsavedPaymentMethod(data: UserDto) {
    const hasOtherMethod = await this.savedMethodRepo.findOneBy({
      userId: data.id,
      isActive: true,
    });

    if (hasOtherMethod) {
      this.logger.log(
        `User ${data.id} has ${hasOtherMethod.provider} saved method — skipping autopayment`,
      );
      return;
    }

    this.eventEmitter.emit(WebhookEventEnum['payment.no_active_method'], {
      userId: data.id,
      provider: 'yookassa',
      reason: 'no_active_method',
    } satisfies Payments.PaymentFailedEventPayload);
  }

  private async attemptAutopaymentWithRetries(
    userId: number,
    paymentMethodId: string,
  ): Promise<
    | {
        status: 'success';
        reason: undefined;
        payment: Payments.IPayment;
        selectedPeriod: number;
        amount: string;
      }
    | { status: 'error'; reason: Payments.CancelReason | undefined; payment: null }
  > {
    let lastReason: Payments.CancelReason | undefined;

    let charge: { selectedPeriod: number; amount: string };
    try {
      charge = await this.resolveRenewalCharge(userId);
    } catch (err: any) {
      // A missing plan or an unpriceable period is not transient — retrying
      // cannot make a defensible charge appear, so fail without calling YooKassa.
      this.logger.error(`Cannot renew user ${userId}: ${err.message}`);
      return { status: 'error', reason: undefined, payment: null };
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      this.logger.log(
        `Autopayment attempt ${attempt}/${MAX_RETRIES}. PaymentMethodId=${paymentMethodId} `,
      );

      try {
        const payment = await this.executeAutopayment(paymentMethodId, charge.amount);

        if (payment.status === 'succeeded') {
          this.logger.log(
            `Autopayment succeeded! PaymentMethodId=${paymentMethodId} (attempt ${attempt})`,
          );
          return { status: 'success', reason: undefined, payment, ...charge };
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

  /**
   * The period being renewed and today's price for it.
   *
   * The period comes from the last *settled subscription* payment: a device-slot
   * purchase or an abandoned checkout says nothing about the customer's plan.
   * The price comes from configuration, never from the previous row — copying
   * the old amount forward would renew a since-changed price (or a one-off
   * device charge) for the life of the subscription.
   */
  private async resolveRenewalCharge(
    userId: number,
  ): Promise<{ selectedPeriod: number; amount: string }> {
    const previousPayment = await this.yookassaPaymentRepo.findOne({
      where: { userId, purpose: 'subscription', status: 'succeeded' },
      order: { createdAt: 'DESC' },
    });

    if (!previousPayment) {
      throw new Error(`No previous subscription payment found for user ${userId}`);
    }

    const { selectedPeriod } = previousPayment;
    return { selectedPeriod, amount: getPriceForPeriod('RUB', selectedPeriod) };
  }

  private async executeAutopayment(
    paymentMethodId: string,
    amount: string,
  ): Promise<Payments.IPayment> {
    const description = process.env.PAYMENT_DESCRIPTION || 'Happy to see you in the JUNGLE 🌴';

    const request: Payments.CreatePaymentRequest = {
      amount: { value: amount, currency: 'RUB' },
      capture: true,
      payment_method_id: paymentMethodId,
      description,
    };

    return this.yookassaProvider.create(request);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async checkAndNotifyExpiry48h(payload: RemnawebhookPayload): Promise<void> {
    const userId = payload.data.id;

    const savedMethod = await this.savedMethodRepo.findOneBy({ userId, isActive: true });

    if (savedMethod) {
      this.logger.log(`User ${userId} has active autopayment — skipping 48h expiry notification`);
      return;
    }

    this.eventEmitter.emit(WebhookEventEnum['payment.expiry_reminder'], {
      userId,
      provider: 'yookassa',
      hoursRemaining: 48,
      remnawavePayload: payload,
    } satisfies Payments.PaymentExpiryReminderEventPayload);

    await this.analyticsClient.track({ event: 'expiry_reminder_sent', userId, hoursRemaining: 48 });
  }
}
