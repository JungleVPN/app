import { BotContext, initialSession } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { isValidUsername, toDateString } from '@bot/utils/utils';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReferralService } from '@referral/referral.service';
import { decodeReferralCode } from '@referral/referral.utils';
import { RemnaService } from '@remna/remna.service';
import { Bot, InlineKeyboard } from 'grammy';
import { AnalyticsService } from '../../analytics/analytics.service';

@Injectable()
export class StartCommand {
  constructor(
    readonly mainMenu: MainMenu,
    readonly mainMenuService: MainMenuService,
    readonly referralService: ReferralService,
    readonly analyticsService: AnalyticsService,
    readonly remnaService: RemnaService,
    readonly configService: ConfigService,
  ) {}

  register(bot: Bot<BotContext>) {
    bot.command('start', async (ctx) => {
      await ctx.react('🍌');
      if (!ctx.from?.id) return;

      const payload = ctx.match;

      if (payload?.startsWith('ref_')) {
        const code = payload.replace('ref_', '');
        const inviterId = decodeReferralCode(code);

        if (inviterId && ctx.from?.id) {
          const result = await this.referralService.handleNewUser(
            inviterId,
            ctx.from.id,
            ctx.from.language_code,
          );

          if (!result.success) {
            if (result.reason === 'self_referral') {
              await ctx.reply(ctx.t('referral-own-user-link-text'));
              return;
            }
            if (result.reason === 'referral_completed') {
              await ctx.reply(ctx.t('referral-completed-text'));
            }
            if (result.reason === 'user_exists') {
              await ctx.reply(ctx.t('referral-existing-user-text'));
            }
            if (result.reason === 'user_is_invited') {
              await ctx.reply(ctx.t('referral-another-inviter-text'));
            }
          } else if (result.reason === 'new_user') {
            await ctx.reply(
              ctx.t('referral-new-user-text', {
                invitedStartBonusInDays: process.env.INVITER_START_BONUS_IN_DAYS || '1',
              }),
            );
          }
        }
      }

      // Look up the user — no creation here. Account setup happens in TMA so
      // that the email is collected upfront, preventing duplicate accounts when
      // the same person uses both web and Telegram.
      const users = await this.remnaService.getUserByTgId(ctx.from.id);
      const rmnUser = users?.[0] ?? null;

      if (!rmnUser) {
        const username = isValidUsername(ctx.from?.username)
          ? ctx.from?.username
          : ctx.t('dear-friend');

        // New user: direct them to TMA to complete setup.
        const keyboard = new InlineKeyboard().webApp(
          ctx.t('connect-button-label'),
          process.env.TMA_APP_URL || 'https://app.thejungle.pro',
        );
        await ctx.reply(
          ctx.t('setup-prompt-text', {
            username: username!,
          }),
          {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          },
        );
      } else {
        ctx.session.user = initialSession().user;
        ctx.session.userId = rmnUser.uuid;
        await this.mainMenuService.init(ctx, this.mainMenu.menu);
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
