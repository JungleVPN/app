import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { isValidUsername } from '@bot/utils/utils';
import { LocaleId } from '@grammyjs/i18n';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ReferralService } from '@referral/referral.service';
import { RemnaService } from '@remna/remna.service';
import { Bot, InlineKeyboard } from 'grammy';

@Injectable()
export class InlineQueryListener {
  bot: Bot<BotContext>;

  constructor(
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    private readonly remnaService: RemnaService,
    private readonly referralService: ReferralService,
    private readonly localService: LocalisationService,
  ) {
    this.bot = this.botService.bot;
  }

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

      const link = this.referralService.getUserReferralLink(rmnUser.uuid);
      const locale =
        (await this.remnaService.getUserLang(rmnUser.uuid)) ||
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
