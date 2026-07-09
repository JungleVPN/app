import { BotContext, initialSession } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { isValidUsername, toDateString } from '@bot/utils/utils';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    readonly configService: ConfigService,
  ) {}

  register(bot: Bot<BotContext>) {
    bot.command('start', async (ctx) => {
      await ctx.react('🍌');
      if (!ctx.from?.id) return;

      const payload = ctx.match;

      // Referral records key by remnawave userId (uuid), which the invited person
      // doesn't have yet at this point — account creation happens in TMA. Decode
      // the inviter's uuid here and forward it through the webApp URL; the
      // referral row is created once the TMA signup call actually creates the
      // invited user's account (see UserService.createUser).
      const inviterId = payload?.startsWith('ref_')
        ? decodeReferralCode(payload.replace('ref_', ''))
        : null;

      // Look up the user — no creation here. Account setup happens in TMA so
      // that the email is collected upfront, preventing duplicate accounts when
      // the same person uses both web and Telegram.
      const users = await this.remnaService.getUserByTgId(ctx.from.id);
      const rmnUser = users?.[0] ?? null;

      if (!rmnUser) {
        const username = isValidUsername(ctx.from?.username)
          ? ctx.from?.username
          : ctx.t('dear-friend');

        if (inviterId) {
          ctx.session.referralInviterId = inviterId;
        }

        // New user: direct them to TMA to complete setup, and attach the
        // persistent menu right away so it's in place from the first message.
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
