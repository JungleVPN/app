import * as process from 'node:process';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
    const { userId, title, description } = dto;
    const allowedPeriods = this.paymentsUtils.getAllowedPeriods();
    const allowedStarsAmounts = this.paymentsUtils.getAllowedStarsAmounts();

    const record = this.starsPaymentRepo.create({
      userId,
      selectedPeriod: allowedPeriods[0],
      starsAmount: allowedStarsAmounts[0],
      status: 'pending',
      telegramPaymentChargeId: null,
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
      [{ label: title, amount: allowedStarsAmounts[0] }],
    );

    this.logger.log(`Created Stars invoice for userId=${userId}, recordId=${saved.id}`);
    return { invoiceLink };
  }

  /**
   * Called by apps/bot after receiving message:successful_payment.
   * Marks the DB record as succeeded, then delegates subscription extension
   * to PaymentStatusService (same flow as YooKassa / Stripe).
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

    await this.starsPaymentRepo.update(paymentRecordId, {
      status: 'succeeded',
      telegramPaymentChargeId,
      paidAt: new Date(),
    });

    const result = await this.paymentStatusService.handlePaymentSucceeded({
      selectedPeriod: record.selectedPeriod,
      userId: record.userId,
    });

    if (!result.success) {
      this.logger.error(`PaymentStatusService failed for Stars record ${paymentRecordId}`);
    } else {
      this.logger.log(
        `Stars payment succeeded for userId=${record.userId}, record=${paymentRecordId}`,
      );
    }

    return { ok: result.success };
  }
}
