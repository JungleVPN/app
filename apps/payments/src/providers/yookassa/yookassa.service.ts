import * as process from 'node:process';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { PaymentsUtils } from '@payments/utils/utils';
import { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import {
  type CreateYookassaSessionDto,
  type IGeneralPayMethod,
  type IPaymentMethod,
  isBankCardPaymentMethod,
  isSavablePaymentMethod,
  type PaymentSession,
  Payments,
  type PaymentWebhookNotification,
  WebhookEvent,
  WebhookEventEnum,
} from '@workspace/types';
import { Repository } from 'typeorm';
import { PaymentStatusService } from '../../payment-status/payment-status.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CIDRMatcher = require('cidr-matcher');

@Injectable()
export class YookassaService {
  private readonly logger = new Logger(YookassaService.name);
  private readonly validIpAddresses: string[] = JSON.parse(
    process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS || '[]',
  );

  constructor(
    private readonly yooKassaProvider: YooKassaProvider,
    @InjectRepository(YookassaPayment)
    private readonly yookassaPaymentRepo: Repository<YookassaPayment>,
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepo: Repository<SavedPaymentMethod>,
    private readonly paymentStatusService: PaymentStatusService,
    private readonly eventEmitter: EventEmitter2,
    private readonly paymentsUtils: PaymentsUtils,
  ) {}

  // ── Query methods ────────────────────────────────────────────────────────

  getActiveSavedMethods(userId: string): Promise<SavedPaymentMethod[]> {
    return this.savedMethodRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  listPayments(): Promise<YookassaPayment[]> {
    return this.yookassaPaymentRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getPaymentById(id: string): Promise<YookassaPayment> {
    const payment = await this.yookassaPaymentRepo.findOneBy({ id });
    if (!payment) throw new NotFoundException(`Yookassa payment ${id} not found`);
    return payment;
  }

  // ── Session creation ────────────────────────────────────────────────────

  async createPaymentSession(dto: CreateYookassaSessionDto): Promise<PaymentSession> {
    const { userId, telegramId, ...paymentFields } = dto;
    const amountValue = this.paymentsUtils.getAllowedAmounts()[0];
    const selectedPeriod = this.paymentsUtils.getAllowedPeriods()[0];

    const request: Payments.CreatePaymentRequest = {
      ...paymentFields,
      amount: {
        value: amountValue,
        currency: 'RUB',
      },
      description: process.env.PAYMENT_DESCRIPTION,
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url:
          dto.confirmation?.type === 'redirect'
            ? dto.confirmation.return_url
            : process.env.RETURN_URL,
      },
    };

    const payment = await this.yooKassaProvider.create(request);
    const confirmationUrl = this.extractConfirmationUrl(payment);

    if (!confirmationUrl) {
      throw new InternalServerErrorException(
        `YooKassa did not return a confirmation URL for payment ${payment.id}`,
      );
    }

    const record = this.yookassaPaymentRepo.create({
      id: payment.id,
      url: confirmationUrl,
      status: payment.status,
      amount: request.amount.value,
      currency: 'RUB',
      userId,
      telegramId: telegramId ?? null,
      selectedPeriod,
      description: payment.description ?? null,
      paidAt: null,
    });
    await this.yookassaPaymentRepo.save(record);

    this.logger.log(`Created Yookassa payment session ${payment.id} for user ${userId}`);
    return { id: payment.id, url: confirmationUrl };
  }

  // ── Webhook handling ────────────────────────────────────────────────────

  async handleWebhook(payload: PaymentWebhookNotification, ip: string) {
    await this.validateWebhookPayload(payload, ip);

    switch (payload.event) {
      case WebhookEventEnum['payment.succeeded']:
        await this.handlePaymentSucceeded(payload);
        break;
      case WebhookEventEnum['payment.canceled']:
        await this.handlePaymentCanceled(payload);
        break;
    }
  }

  async handlePaymentSucceeded(payload: PaymentWebhookNotification): Promise<void> {
    const { payment_method, id, status, captured_at } = payload.object;

    // Single-retry lookup: autopayments can return status=succeeded synchronously
    // from YooKassa, meaning the webhook may arrive before the initiating service
    // has committed the DB record. A 1.5 s pause covers the write propagation gap
    // without meaningfully delaying normal webhook delivery.
    let record = await this.yookassaPaymentRepo.findOneBy({ id });
    if (!record) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      record = await this.yookassaPaymentRepo.findOneBy({ id });
    }

    if (!record?.userId || !record?.selectedPeriod) {
      this.logger.error(
        `Payment ${id}: no DB record found after retry — possible orphaned payment, manual recovery needed`,
      );
      return;
    }

    if (record.status === 'succeeded' && record.paidAt !== null) {
      this.logger.log(`Payment ${id} already processed — ignoring duplicate webhook`);
      return;
    }

    await this.yookassaPaymentRepo.update(id, {
      status,
      paidAt: captured_at ? new Date(captured_at) : new Date(),
      url: null,
    });

    const result = await this.paymentStatusService.handleUserUpdates({
      selectedPeriod: record.selectedPeriod,
      userId: record.userId,
    });

    if (result.success) {
      this.eventEmitter.emit(WebhookEventEnum['payment.succeeded'], {
        userId: record.userId,
        provider: 'yookassa',
        selectedPeriod: record.selectedPeriod,
      } satisfies Payments.PaymentSucceededEventPayload);

      if (payment_method && isSavablePaymentMethod(payment_method) && payment_method.saved) {
        await this.activatePaymentMethod({ userId: record.userId, payment_method });
      }
    }
  }

  async handlePaymentCanceled(payload: PaymentWebhookNotification): Promise<void> {
    const { id, status, cancellation_details, payment_method } = payload.object;

    const record = await this.yookassaPaymentRepo.findOneBy({ id });

    if (record?.status === 'succeeded' && record.paidAt !== null) {
      this.logger.warn(
        `Payment ${id} already succeeded — ignoring late canceled webhook (reason: ${cancellation_details?.reason ?? 'unknown'})`,
      );
      return;
    }

    await this.yookassaPaymentRepo.update(id, { status, url: null });

    if (!cancellation_details || !record) return;

    // Autopayment: payment_method.saved=true means this charge used a stored method.
    // AutopaymentService already emitted payment.autopayment_failed — skip duplicate.
    if (payment_method && isSavablePaymentMethod(payment_method) && payment_method.saved) {
      this.logger.log(`Payment ${id} canceled via autopayment — notification already sent by autopayment service`);
      return;
    }

    // User has an active saved method: AutopaymentService will handle the retry and
    // will emit its own failure event if all retries are exhausted.
    const hasSavedMethod = await this.savedMethodRepo.findOneBy({
      userId: record.userId,
      isActive: true,
    });

    if (hasSavedMethod) {
      this.logger.log(`Payment ${id} canceled but user ${record.userId} has an active saved method — skipping payment.canceled notification`);
      return;
    }

    // First payment: user has never successfully paid — no failure notification.
    const priorSucceededCount = await this.yookassaPaymentRepo.count({
      where: { userId: record.userId, status: 'succeeded' },
    });

    if (priorSucceededCount === 0) {
      this.logger.log(`Payment ${id} canceled on first attempt for user ${record.userId} — skipping notification`);
      return;
    }

    this.eventEmitter.emit(WebhookEventEnum['payment.canceled'], {
      userId: record.userId,
      provider: 'yookassa',
      selectedPeriod: record.selectedPeriod ?? 0,
      reason: cancellation_details.reason,
    } satisfies Payments.PaymentFailedEventPayload);
  }

  // ── Saved payment methods ───────────────────────────────────────────────

  async deletePaymentMethod(id: string, userId: string): Promise<void> {
    const method = await this.savedMethodRepo.findOneBy({ id, userId });
    if (!method) {
      throw new NotFoundException(`Saved payment method ${id} not found for user ${userId}`);
    }

    await this.savedMethodRepo.delete({ id, userId });
    this.logger.log(`Deleted saved payment method ${id} for user ${userId}`);
  }

  /**
   * Activates a new payment method for a user.
   *
   * Idempotent: if `paymentMethodId` already exists, nothing is written.
   * Deactivates any previously active methods before saving the new one.
   * Errors are swallowed — this is best-effort and must not block webhook processing.
   */
  private async activatePaymentMethod({
    userId,
    payment_method,
  }: {
    userId: string;
    payment_method: IPaymentMethod & IGeneralPayMethod;
  }): Promise<void> {
    try {
      const existing = await this.savedMethodRepo.findOneBy({
        paymentMethodId: payment_method.id,
      });
      if (existing) {
        this.logger.log(`Payment method ${payment_method.id} already stored — skipping`);
        return;
      }

      await this.savedMethodRepo.update({ userId, isActive: true }, { isActive: false });

      const card = isBankCardPaymentMethod(payment_method) ? payment_method.card : undefined;

      const method = this.savedMethodRepo.create({
        userId,
        provider: 'yookassa',
        paymentMethodId: payment_method.id,
        paymentMethodType: payment_method.type,
        title: payment_method.title ?? null,
        card: card
          ? {
              last4: card.last4,
              expiryMonth: card.expiry_month,
              expiryYear: card.expiry_year,
              cardType: card.card_type,
              first6: card.first6,
              issuerCountry: card.issuer_country,
            }
          : null,
        isActive: true,
      });

      await this.savedMethodRepo.save(method);

      this.logger.log(
        `Activated payment method ${payment_method.id} (${payment_method.type}) for user ${userId}`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to activate payment method for user ${userId}: ${err.message}`);
    }
  }

  // ── Webhook validation ──────────────────────────────────────────────────

  async validateWebhookPayload(payload: PaymentWebhookNotification, ip: string): Promise<void> {
    const isIPRangeValid = await this.isIPRangeValid(ip);
    if (!isIPRangeValid) {
      throw new BadRequestException(`Webhook request from unauthorized IP: ${ip}`);
    }

    if (!this.isValidWebhookPayload(payload)) {
      throw new BadRequestException('Invalid webhook payload structure');
    }

    const paymentId = payload.object.id;
    const webhookStatus = payload.object.status;

    const { status } = await this.yooKassaProvider.getPayment(paymentId);
    if (status !== webhookStatus) {
      throw new BadRequestException(
        `Payment status mismatch for ${paymentId}: webhook=${webhookStatus}, API=${status}`,
      );
    }
  }

  async isIPRangeValid(ip: string): Promise<boolean> {
    const normalizedIps = this.getNormalizedIPs();
    const matcher = new CIDRMatcher(normalizedIps);
    const ips = ip.split(',').map((i) => i.trim());

    if (!ips.some((i) => matcher.contains(i))) {
      this.logger.warn(`Invalid YooKassa IP: ${ip}`);
      return false;
    }

    return true;
  }

  isValidNotificationEvent(event: string): event is WebhookEvent {
    return ['payment.succeeded', 'payment.canceled', 'payment.waiting_for_capture'].includes(event);
  }

  isValidWebhookPayload(payload: PaymentWebhookNotification): boolean {
    return (
      !!payload.object &&
      payload.type === 'notification' &&
      this.isValidNotificationEvent(payload.event)
    );
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private extractConfirmationUrl(payment: Payments.IPayment): string | undefined {
    const { confirmation } = payment;
    if (confirmation && confirmation.type === 'redirect') {
      return confirmation.confirmation_url;
    }
    return undefined;
  }

  private getNormalizedIPs(): string[] {
    return this.validIpAddresses.map((ipAddr) => {
      if (ipAddr.includes('/')) return ipAddr;
      return ipAddr.includes(':') ? `${ipAddr}/128` : `${ipAddr}/32`;
    });
  }
}
