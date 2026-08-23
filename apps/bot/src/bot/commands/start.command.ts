import { BotContext, initialSession } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { isValidUsername, withReferral } from '@bot/utils/utils';
import { Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';
import { decodeStartPayload } from '@utils/url';
import { Bot } from 'grammy';
import { AnalyticsService } from '../../analytics/analytics.service';

@Injectable()
export class StartCommand {
  constructor(
    readonly mainMenu: MainMenu,
    readonly mainMenuService: MainMenuService,
    readonly remnaService: RemnaService,
    readonly analyticsService: AnalyticsService,
  ) {}

  register(bot: Bot<BotContext>) {
    bot.command('start', (ctx) => this.handle(ctx));
  }

  async handle(ctx: BotContext): Promise<void> {
    await ctx.react('🍌');
    if (!ctx.from?.id) return;

    ctx.session.userId = undefined;
    ctx.session.lang = undefined;

    const matchStr = typeof ctx.match === 'string' ? ctx.match : (ctx.match?.[0] ?? '');
    ctx.session.startPayload = decodeStartPayload(matchStr, process.env.REFERRAL_CODE_SECRET ?? '');

    const users = await this.remnaService.getUserByTgId(ctx.from.id);
    const rmnUser = users?.[0] ?? null;

    const tmaAppUrl = process.env.TMA_APP_URL || 'https://app.thejungle.pro';
    void ctx.api.setChatMenuButton({
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
      ctx.session.userId = rmnUser.id;

      if (ctx.from.language_code) {
        const existingLang = await this.remnaService.getUserLang(rmnUser.id);
        const resolvedLang = existingLang ?? ctx.from.language_code;
        if (!existingLang) {
          void this.remnaService.upsertUserLang(rmnUser.id, ctx.from.language_code);
        }
        ctx.session.lang = resolvedLang;
      }

      await this.mainMenuService.init(ctx, this.mainMenu, undefined, rmnUser);
    }

    const adCode =
      ctx.session.startPayload?.type === 'ad' ? ctx.session.startPayload.value : undefined;

    this.analyticsService.trackBotStarted({
      telegramId: ctx.from.id,
      email: rmnUser?.email || null,
      adCode,
      isReturningUser: rmnUser !== null,
    });
  }
}
