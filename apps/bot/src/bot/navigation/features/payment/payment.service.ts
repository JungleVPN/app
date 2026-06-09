import * as process from 'node:process';
import { BotContext } from '@bot/bot.types';
import { PaymentMenu } from '@bot/navigation/features/payment/payment.menu';
import { Base } from '@bot/navigation/menu.base';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CurrencyService } from '@payments/currency-service/currency.service';

@Injectable()
export class PaymentMsgService extends Base {
  constructor(
    readonly currencyService: CurrencyService,
    @Inject(forwardRef(() => PaymentMenu))
    readonly paymentMenu: PaymentMenu,
  ) {
    super();
  }

  async init(ctx: BotContext) {
    const session = ctx.session;
    const { selectedProvider } = session;

    if (!selectedProvider) {
      await ctx.reply(ctx.t('error-generic-restart'));
      return;
    }

    // const {  currency } = this.currencyService.getPriceForPeriod(
    //   selectedPeriod,
    //   selectedProvider,
    // );

    const content = ctx.t('payment-text', {
      amount: process.env.PUBLIC_ALLOWED_AMOUNT_RUB || '250',
      period: ctx.t(`period-${process.env.PUBLIC_ALLOWED_PERIOD}`),
      currency: '₽',
      link: process.env.TERMS_URL || 'https://thejungle.pro/app/terms',
    });

    await this.render(ctx, content, this.paymentMenu.menu);
  }
}
