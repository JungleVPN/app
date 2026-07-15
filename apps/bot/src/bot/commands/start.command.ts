import { BotContext, initialSession } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { isValidUsername } from '@bot/utils/utils';
import { Injectable } from '@nestjs/common';
import { decodeReferralCode } from '@referral/referral.utils';
import { RemnaService } from '@remna/remna.service';
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

      const payload = ctx.match;

      const inviterId = payload?.startsWith('ref_')
        ? decodeReferralCode(payload.replace('ref_', ''))
        : null;

      const users = await this.remnaService.getUserByTgId(ctx.from.id);
      const rmnUser = users?.[0] ?? null;

      if (rmnUser && ctx.from.language_code) {
        const existingLang = await this.remnaService.getUserLang(rmnUser.uuid);
        if (!existingLang) {
          await this.remnaService.upsertUserLang(rmnUser.uuid, ctx.from.language_code);
        }
      }

      if (!rmnUser) {
        const username = isValidUsername(ctx.from?.username)
          ? ctx.from?.username
          : ctx.t('dear-friend');

        if (inviterId) {
          ctx.session.referralInviterId = inviterId;
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

        await this.mainMenuService.init(ctx, this.mainMenu);
      }
    });
  }
}
