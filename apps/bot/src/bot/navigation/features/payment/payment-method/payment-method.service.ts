import * as process from 'node:process';
import { BotContext } from '@bot/bot.types';
import { PaymentMsgService } from '@bot/navigation/features/payment/payment.service';
import { Base } from '@bot/navigation/menu.base';
import { Injectable } from '@nestjs/common';
import { PaymentsService } from '@payments/payments.service';
import { RemnaService } from '@remna/remna.service';
import { PaymentProvider, PaymentSession } from '@shared/payments';
import type { CreateYookassaSessionDto } from '@workspace/types';

@Injectable()
export class PaymentMethodMsgService extends Base {
  constructor(
    readonly remnaService: RemnaService,
    readonly paymentsService: PaymentsService,
    readonly paymentMsgService: PaymentMsgService,
  ) {
    super();
  }

  async handlePaymentMethod(ctx: BotContext, provider: PaymentProvider) {
    const tgUser = this.validateUser(ctx.from);
    const user = await this.remnaService.getUserByTgId(tgUser.id);

    if (!user || !process.env.ALLOWED_PERIODS) {
      await ctx.reply(ctx.t('error-generic-restart'));
      return;
    }

    const paymentSession = await this.createSessionForProvider(provider, {
      userId: user[0].uuid,
      save_payment_method: true,
      amount: { value: process.env.ALLOWED_AMOUNTS || '250', currency: 'RUB' },
      description: process.env.PAYMENT_DESCRIPTION || ' subscription',
      confirmation: {
        return_url: process.env.BOT_RETURN_URL,
        type: 'redirect',
      },
    });

    ctx.session.paymentUrl = paymentSession.url;

    await this.paymentMsgService.init(ctx);
  }

  private async createSessionForProvider(
    provider: PaymentProvider,
    params: CreateYookassaSessionDto,
  ): Promise<PaymentSession> {
    const metadata = {
      description: params.description,
    };

    switch (provider) {
      case 'stripe':
        return this.paymentsService.createStripeSession({
          userId: params.userId,
          payment: {
            amount: params.amount.value,
            currency: 'EUR',
          },
          metadata,
        });

      case 'yookassa':
        return this.paymentsService.createYookassaSession(params);
    }
  }
}
