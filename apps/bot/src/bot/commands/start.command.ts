import { BotContext, initialSession } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { isValidUsername, withReferral } from '@bot/utils/utils';
import { Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';
import { decodeStartPayload } from '@utils/url';
import { Bot } from 'grammy';

@Injectable()
export class StartCommand {
  constructor(
    readonly mainMenu: MainMenu,
    readonly mainMenuService: MainMenuService,
    readonly remnaService: RemnaService,
  ) {}

  register(bot: Bot<BotContext>) {
    bot.command('start', async (ctx) => {
      await ctx.react('🍌');
      if (!ctx.from?.id) return;

      ctx.session.startPayload = decodeStartPayload(ctx.match);

      const users = await this.remnaService.getUserByTgId(ctx.from.id);
      const rmnUser = users?.[0] ?? null;

      if (rmnUser && ctx.from.language_code) {
        const existingLang = await this.remnaService.getUserLang(rmnUser.uuid);
        if (!existingLang) {
          await this.remnaService.upsertUserLang(rmnUser.uuid, ctx.from.language_code);
        }
      }

      const tmaAppUrl = process.env.PUBLIC_TMA_APP_URL || 'https://app.thejungle.pro';
      await ctx.api.setChatMenuButton({
        chat_id: ctx.from?.id,
        menu_button: {
          type: 'web_app',
          text: ctx.t('menu-app-button-label'),
          web_app: { url: withReferral(ctx, tmaAppUrl) },
        },
      });

      if (!rmnUser) {
        const username = isValidUsername(ctx.from?.username)
          ? ctx.from?.username
          : ctx.t('dear-friend');

        await ctx.reply(
          ctx.t('setup-prompt-text', {
            username: username!,
          }),
          {
            parse_mode: 'HTML',
            reply_markup: this.mainMenu.build(ctx),
          },
        );
      } else {
        ctx.session.user = initialSession().user;
        ctx.session.userId = rmnUser.uuid;

        await this.mainMenuService.init(ctx, this.mainMenu);
      }
    });
  }
}
