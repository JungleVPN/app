import { BotContext } from '@bot/bot.types';
import { Injectable, Logger } from '@nestjs/common';
import { PaymentsService } from '@payments/payments.service';
import { Bot } from 'grammy';

/**
 * Handles Telegram Stars payment lifecycle updates from Telegram:
 *
 * 1. `pre_checkout_query` — Telegram asks the bot to confirm before charging.
 *    Must be answered within 10 seconds. We always approve here; business
 *    validation (user exists, period valid) is done at invoice creation time.
 *
 * 2. `message:successful_payment` — Telegram confirms the user was charged.
 *    We extract the paymentRecordId from the invoice payload and call
 *    apps/payments to update the DB record and extend the subscription.
 */
@Injectable()
export class TelegramStarsListener {
  private readonly logger = new Logger(TelegramStarsListener.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  register(bot: Bot<BotContext>) {
    // Step 1: approve all Stars pre-checkout queries
    bot.on('pre_checkout_query', async (ctx) => {
      try {
        await ctx.answerPreCheckoutQuery(true);
        this.logger.log(`Approved pre_checkout_query id=${ctx.preCheckoutQuery.id}`);
      } catch (err: any) {
        this.logger.error(`answerPreCheckoutQuery failed: ${err.message}`);
      }
    });

    // Step 2: handle successful payment
    bot.on('message:successful_payment', async (ctx) => {
      const payment = ctx.message.successful_payment;

      if (!payment) {
        this.logger.warn('message:successful_payment received with no payment object');
        return;
      }

      const { telegram_payment_charge_id, invoice_payload } = payment;

      let paymentRecordId: string | undefined;
      try {
        const parsed = JSON.parse(invoice_payload);
        paymentRecordId = parsed.paymentRecordId;
      } catch {
        this.logger.error(`Failed to parse Stars invoice payload: ${invoice_payload}`);
        return;
      }

      if (!paymentRecordId) {
        this.logger.error(`Stars invoice payload missing paymentRecordId: ${invoice_payload}`);
        return;
      }

      this.logger.log(
        `Stars payment succeeded: chargeId=${telegram_payment_charge_id}, recordId=${paymentRecordId}`,
      );

      await this.paymentsService.handleTelegramStarsPaymentSucceeded({
        paymentRecordId,
        telegramPaymentChargeId: telegram_payment_charge_id,
      });
    });
  }
}
