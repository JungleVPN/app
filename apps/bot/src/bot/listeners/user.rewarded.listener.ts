import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { toDateString } from '@bot/utils/utils';
import { LocaleId } from '@grammyjs/i18n';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RemnaService } from '@remna/remna.service';
import { Bot } from 'grammy';

@Injectable()
export class UserRewardedListener {
  bot: Bot<BotContext>;

  constructor(
    private readonly botService: BotService,
    private readonly remnaService: RemnaService,
    private readonly localService: LocalisationService,
  ) {
    this.bot = this.botService.bot;
  }

  @OnEvent('user.rewarded')
  async handleUserRewardedListener(payload: { telegramId: number; role: 'inviter' | 'invited' }) {
    const { telegramId, role } = payload;

    const user = await this.remnaService.getUserByTgId(telegramId);
    const expireAt = user?.[0].expireAt;
    const locale =
      (user?.[0]?.uuid ? await this.remnaService.getUserLang(user[0].uuid) : null) ||
      (process.env.PUBLIC_DEFAULT_LOCALE as LocaleId);

    const formattedDate = toDateString(expireAt!);

    const textKey = role === 'inviter' ? 'user-rewarded-text' : 'referred-user-rewarded-text';
    const content = this.localService.i18n.t(locale, textKey, {
      referralBonusInDays: process.env.REFERRAL_BONUS_IN_DAYS || '30',
      formattedDate,
    });

    try {
      await this.bot.api.sendMessage(telegramId, content, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.log('Failed to send user.rewarded message');
    }
  }
}
