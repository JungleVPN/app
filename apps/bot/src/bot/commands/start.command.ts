import * as process from 'node:process';
import { BotContext, initialSession } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { isValidUsername, toDateString, withReferral } from '@bot/utils/utils';
import { Injectable } from '@nestjs/common';
import { decodeReferralCode } from '@referral/referral.utils';
import { RemnaService } from '@remna/remna.service';
import { Bot } from 'grammy';
import { AnalyticsService } from '../../analytics/analytics.service';

@Injectable()
export class StartCommand {
  constructor(
    readonly mainMenu: MainMenu,
    readonly mainMenuService: MainMenuService,
    readonly analyticsService: AnalyticsService,
    readonly remnaService: RemnaService,
  ) {}

  register(bot: Bot<BotContext>) {
    bot.command('start', async (ctx) => {
      await ctx.react('🍌');
      if (!ctx.from?.id) return;

      const payload = ctx.match;

      const inviterId = payload?.startsWith('ref_')
        ? decodeReferralCode(payload.replace('ref_', ''))
        : null;

      const users = await this.remnaService.getUserByTgId(ctx.from.id);
      const rmnUser = users?.[0] ?? null;

      if (!rmnUser) {
        const username = isValidUsername(ctx.from?.username)
          ? ctx.from?.username
          : ctx.t('dear-friend');

        if (inviterId) {
          ctx.session.referralInviterId = inviterId;

          // BotFather's menu button is static and has no ref param. Override it
          // per-chat so this user's menu button opens the TMA with their inviterId.
          const tmaAppUrl = process.env.TMA_APP_URL || 'https://miniapp.thejungle.pro';
          await ctx.api.setChatMenuButton({
            chat_id: ctx.from.id,
            menu_button: {
              type: 'web_app',
              text: ctx.t('connect-button-label'),
              web_app: { url: withReferral(ctx, tmaAppUrl) },
            },
          });
        }

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
        const tmaAppUrl = process.env.TMA_APP_URL || 'https://miniapp.thejungle.pro';
        await ctx.api.setChatMenuButton({
          chat_id: ctx.from.id,
          menu_button: {
            type: 'web_app',
            text: ctx.t('connect-button-label'),
            web_app: { url: tmaAppUrl },
          },
        });
        await this.mainMenuService.init(ctx, this.mainMenu);
      }

      if (payload?.startsWith('ad_')) {
        await this.addData(payload, ctx.from?.id || 0);
      }

      if (payload?.startsWith('web_app')) {
        await this.addData(payload, ctx.from?.id || 0);
      }
    });
  }

  async addData(channel: string, userId: number) {
    await this.analyticsService.addData({
      channel,
      userId,
      dateAndTime: toDateString(new Date(), true),
      sheetId: `${process.env.GOOGLE_SHEET_TITLE}!A2`,
    });
  }
}
