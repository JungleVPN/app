import * as process from 'node:process';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { isValidUsername } from '@bot/utils/utils';
import { LocaleId } from '@grammyjs/i18n';
import { Injectable } from '@nestjs/common';
import { ReferralService } from '@referral/referral.service';
import { RemnaService } from '@remna/remna.service';
import { Bot, InlineKeyboard } from 'grammy';

@Injectable()
export class InlineQueryListener {
  constructor(
    private readonly remnaService: RemnaService,
    private readonly referralService: ReferralService,
    private readonly localService: LocalisationService,
  ) {}

  register(bot: Bot<BotContext>) {
    bot.on('inline_query', async (ctx) => {
      const users = await this.remnaService.getUserByTgId(ctx.from.id);
      const rmnUser = users?.[0] ?? null;

      // Referral links are keyed by the remnawave userId (uuid) now, so only a
      // registered user can share one.
      if (!rmnUser) {
        await ctx.answerInlineQuery([]);
        return;
      }

      const link = this.referralService.getUserReferralLink(rmnUser.id);
      const locale =
        (await this.remnaService.getUserLang(rmnUser.id)) ||
        (process.env.DEFAULT_LOCALE as LocaleId);

      const keyboard = new InlineKeyboard().url(
        this.localService.i18n.t(locale, 'connect-button-label'),
        link,
      );
      const username = isValidUsername(ctx.from?.username)
        ? ctx.from?.username
        : ctx.t('dear-friend');

      const title = this.localService.i18n.t(locale, 'invite-inline-title');
      const description = this.localService.i18n.t(locale, 'invite-inline-description');

      await ctx.answerInlineQuery([
        {
          type: 'article',
          id: 'referral-link',
          title,
          thumbnail_url: `${process.env.REMNAWAVE_PANEL_URL}/assets/logo.jpg`,
          description,
          input_message_content: {
            message_text: ctx.t('invitation-text', {
              username: username!,
            }),
            parse_mode: 'HTML',
          },
          reply_markup: keyboard,
        },
      ]);
    });
  }
}
