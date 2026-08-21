import * as process from 'node:process';
import { BotContext } from '@bot/bot.types';
import { ReferralMenu } from '@bot/navigation/features/referral/referral.menu';
import { ReferralMenuService } from '@bot/navigation/features/referral/referral.service';
import { SupportMenu } from '@bot/navigation/features/support/support.menu';
import { Base } from '@bot/navigation/menu.base';
import { withReferral } from '@bot/utils/utils';
import { hears } from '@grammyjs/i18n';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';

@Injectable()
export class MainKeyboardCallback extends Base {
  constructor(
    @Inject(forwardRef(() => ReferralMenu))
    readonly referralMenu: ReferralMenu,
    readonly referralMenuService: ReferralMenuService,
    readonly supportMenu: SupportMenu,
  ) {
    super();
  }

  register(bot: Bot<BotContext>) {
    bot.filter(hears('connect-button-label'), async (ctx) => {
      const tmaAppUrl = process.env.TMA_APP_URL || 'https://miniapp.thejungle.pro';
      const connectUrl = withReferral(ctx, tmaAppUrl);
      await ctx.reply(ctx.t('connect-instruction-text'), {
        reply_markup: new InlineKeyboard().webApp(ctx.t('connect-button-label'), connectUrl),
      });
    });

    bot.filter(hears('pay-button-label'), async (ctx) => {
      const tmaPaymentUrl =
        process.env.TMA_APP_PAYMENT_URL || 'https://app.thejungle.pro/profile/payments';
      const webAppUrl = process.env.WEB_PAYMENT_URL || 'https://jungle.community/profile/payments';
      const webtUrl = withReferral(ctx, webAppUrl);

      await ctx.reply(ctx.t('pay-instruction-text'), {
        reply_markup: new InlineKeyboard()
          .webApp(ctx.t('pay-button-label'), withReferral(ctx, tmaPaymentUrl))
          .url(ctx.t('web-button-label'), webtUrl),
      });
    });

    bot.filter(hears('referra-button-label'), async (ctx) => {
      await this.referralMenuService.init(ctx, this.referralMenu.menu);
    });

    bot.filter(hears('chanel-button-label'), async (ctx) => {
      await ctx.reply(ctx.t('chanel-instruction-text'), {
        reply_markup: new InlineKeyboard().url(
          ctx.t('chanel-button-label'),
          process.env.TELEGRAM_CHANNEL_URL || 'https://t.me/in_the_jungle',
        ),
      });
    });

    bot.filter(hears('not-workinig-button-label'), async (ctx) => {
      await this.render(ctx, ctx.t('support-text'), this.supportMenu.menu);
    });
  }
}
