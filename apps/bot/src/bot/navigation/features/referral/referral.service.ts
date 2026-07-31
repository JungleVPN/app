import * as process from 'node:process';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { Menu } from '@bot/navigation';
import { Base } from '@bot/navigation/menu.base';
import { withReferral } from '@bot/utils/utils';
import { LocaleId } from '@grammyjs/i18n';
import { Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';
import { InlineKeyboard } from 'grammy';

@Injectable()
export class ReferralMenuService extends Base {
  constructor(
    private readonly remnaService: RemnaService,
    private readonly localService: LocalisationService,
  ) {
    super();
  }

  async init(ctx: BotContext, menu: Menu | InlineKeyboard, deleteOldMsg?: boolean) {
    const user = await this.remnaService.getUserByTgId(ctx.from?.id || 0);
    ctx.session.userId = user?.[0].uuid;
    const locale =
      (user?.[0]?.uuid ? await this.remnaService.getUserLang(user[0].uuid) : null) ||
      (process.env.DEFAULT_LOCALE as LocaleId);

    let menuToSend = menu;
    let content = this.localService.i18n.t(locale, 'referral-page-text', {
      referralBonusInDays: process.env.REFERRAL_BONUS_IN_DAYS || '30',
    });

    if (!user) {
      content = this.localService.i18n.t(locale, 'referral-not-active-text');
      const tmaAppUrl = process.env.PUBLIC_TMA_APP_URL || 'https://miniapp.thejungle.pro';
      const connectUrl = withReferral(ctx, tmaAppUrl);
      menuToSend = new InlineKeyboard().webApp(ctx.t('connect-button-label'), connectUrl);
    }

    await this.render(ctx, content, menuToSend, deleteOldMsg);
  }
}
