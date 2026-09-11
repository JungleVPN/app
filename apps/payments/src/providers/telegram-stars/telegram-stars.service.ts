import * as process from 'node:process';
import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { PaymentsUtils } from '@payments/utils/utils';
import { TelegramStarsPayment } from '@workspace/database';
import type {
  CreateTelegramStarsInvoiceDto,
  TelegramStarsInvoiceResponse,
  TelegramStarsPaymentSucceededDto,
} from '@workspace/types';
import { Bot } from 'grammy';
import { Repository } from 'typeorm';
import { PaymentStatusService } from '../../payment-status/payment-status.service';
import { PromoInvalidError, PromoService } from '../../promo/promo.service';

/**
 * Telegram Stars payment provider.
 *
 * Uses a grammY `Bot` instance purely as an HTTP client to Telegram's Bot API
 * (bot.api.*) — `bot.start()` is never called, so it does not conflict with
 * the polling/webhook loop running in apps/bot.
 */
@Injectable()
export class TelegramStarsService implements OnModuleInit {
  private readonly logger = new Logger(TelegramStarsService.name);
  private bot: Bot;

  constructor(
    @InjectRepository(TelegramStarsPayment)
    private readonly starsPaymentRepo: Repository<TelegramStarsPayment>,
    private readonly paymentStatusService: PaymentStatusService,
    private readonly paymentsUtils: PaymentsUtils,
    private readonly promoService: PromoService,
    private readonly analyticsClient: AnalyticsClientService,
  ) {}

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for TelegramStarsService');
    }
    // Instantiate without starting — we only use bot.api.*
    this.bot = new Bot(token);
  }

  /**
   * Generates a Telegram Stars invoice link and persists a pending payment record.
   * The record id is embedded in the invoice payload so the bot can reference it
   * when the successful_payment update arrives.
   */
  async createInvoice(dto: CreateTelegramStarsInvoiceDto): Promise<TelegramStarsInvoiceResponse> {
    const { userId, title, telegramId, description, purpose = 'subscription' } = dto;
    const starsAmount =
      purpose === 'extra_device'
        ? this.paymentsUtils.getExtraDeviceStarsAmount()
        : this.paymentsUtils.getAllowedStarsAmounts()[0];

    // Validate any promo up front so the user gets immediate feedback. Only
    // subscription payments carry promos; the binding check is at fulfillment.
    const validatedPromoCode =
      purpose === 'subscription' && dto.promoCode
        ? await this.validatePromoOrThrow(dto.promoCode, {
            userId,
            userStatus: dto.userStatus,
            // TODO Fix periods and add plans
            selectedPeriod: 1,
          })
        : null;

    const record = this.starsPaymentRepo.create({
      userId,
      selectedPeriod: 1,
      starsAmount,
      telegramId,
      status: 'pending',
      telegramPaymentChargeId: null,
      purpose,
      promoCode: validatedPromoCode,
      paidAt: null,
    });
    const saved = await this.starsPaymentRepo.save(record);

    // The payload is passed back to the bot verbatim inside successful_payment.
    // We embed the record id so the bot can call handlePaymentSucceeded without
    // a separate lookup by userId.
    const payload = JSON.stringify({ paymentRecordId: saved.id });

    const invoiceLink = await this.bot.api.createInvoiceLink(
      title,
      description,
      payload,
      '', // provider_token must be empty string for Telegram Stars (XTR)
      'XTR',
      [{ label: title, amount: starsAmount }],
    );

    await this.analyticsClient.track({
      event: 'checkout_started',
      userId,
      provider: 'stars',
      purpose,
      amount: starsAmount.toString(),
      currency: 'XTR',
    });

    this.logger.log(`Created Stars invoice for userId=${userId}, recordId=${saved.id}`);
    return { invoiceLink };
  }

  /** Validate a promo code at checkout; returns the normalized code or throws 400. */
  private async validatePromoOrThrow(
    code: string,
    ctx: { userId: number; userStatus?: string; selectedPeriod: number },
  ): Promise<string> {
    try {
      await this.promoService.resolve(code, ctx);
      return code.trim().toUpperCase();
    } catch (err) {
      if (err instanceof PromoInvalidError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  /**
   * Called by apps/bot after receiving message:successful_payment.
   * Marks the DB record as succeeded, then delegates to PaymentStatusService
   * which dispatches based on purpose.
   */
  async handlePaymentSucceeded(dto: TelegramStarsPaymentSucceededDto): Promise<{ ok: boolean }> {
    const { paymentRecordId, telegramPaymentChargeId } = dto;

    const record = await this.starsPaymentRepo.findOneBy({ id: paymentRecordId });

    if (!record) {
      this.logger.error(`Stars payment record not found: ${paymentRecordId}`);
      return { ok: false };
    }

    if (record.status === 'succeeded') {
      this.logger.log(`Stars payment ${paymentRecordId} already processed — skipping`);
      return { ok: true };
    }

    const priorSucceeded = await this.starsPaymentRepo.count({
      where: { userId: record.userId, status: 'succeeded' },
    });
    const isFirstPayment = priorSucceeded === 0;

    await this.starsPaymentRepo.update(paymentRecordId, {
      status: 'succeeded',
      telegramPaymentChargeId,
      paidAt: new Date(),
    });

    const result = await this.paymentStatusService.handleUserUpdates({
      selectedPeriod: record.selectedPeriod,
      userId: record.userId,
      purpose: record.purpose,
      promo: { code: record.promoCode, provider: 'stars', paymentId: record.id },
    });

    if (!result.success) {
      this.logger.error(`PaymentStatusService failed for Stars record ${paymentRecordId}`);
    } else {
      await this.analyticsClient.track({
        event: 'payment_succeeded',
        userId: record.userId,
        provider: 'stars',
        purpose: record.purpose,
        selectedPeriod: record.selectedPeriod,
        isFirstPayment,
        isAutoPayment: false,
        amount: record.starsAmount?.toString(),
        currency: 'XTR',
      });

      this.logger.log(
        `Stars payment succeeded for userId=${record.userId}, record=${paymentRecordId}`,
      );
    }

    return { ok: result.success };
  }
}
