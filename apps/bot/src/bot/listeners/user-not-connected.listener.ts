import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { safeSendMessage } from '@bot/utils/utils';
import { LocaleId } from '@grammyjs/i18n';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebHookEvent } from '@remna/remna.model';
import { RemnaService } from '@remna/remna.service';
import { UserDto } from '@workspace/types';
import { differenceInHours } from 'date-fns';
import { Bot, InlineKeyboard } from 'grammy';

@Injectable()
export class UserNotConnectedListener {
  bot: Bot<BotContext>;
  private readonly logger = new Logger(UserNotConnectedListener.name);

  constructor(
    readonly botService: BotService,
    readonly localService: LocalisationService,
    readonly remnaService: RemnaService,
  ) {
    this.bot = this.botService.bot;
  }

  @OnEvent('user.not_connected')
  async listenToUserNotConnectedEvent(payload: {
    event: WebHookEvent;
    data: UserDto;
    timestamp: string;
  }) {
    const locale =
      (payload.data.uuid ? await this.remnaService.getUserLang(payload.data.uuid) : null) ||
      (process.env.PUBLIC_DEFAULT_LOCALE as LocaleId);
    const createdAt = new Date(payload.data.createdAt);
    const timestamp = new Date(payload.timestamp);
    const diffHours = differenceInHours(timestamp, createdAt);

    const keyboard = new InlineKeyboard()
      .webApp(
        this.localService.i18n.t(locale, 'profile-button-label'),
        process.env.PUBLIC_TMA_APP_URL || 'https://app.thejungle.pro',
      )
      .text(this.localService.i18n.t(locale, 'home-button-label'), 'navigate_main')
      .row()
      .url(
        this.localService.i18n.t(locale, 'support-button-label'),
        process.env.PUBLIC_SUPPORT_URL || 'https://t.me/JungleVPN_support_bot',
      );

    if (!payload.data.telegramId) {
      this.logger.warn(`Skipping not-connected notification: telegramId is null`);
      return;
    }

    if (diffHours >= Number(process.env.TREE_DAYS_IN_HOURS)) {
      await this.handleThreeDays(payload.data.telegramId, locale, keyboard);
      return;
    }

    await this.handleInitial(payload.data.telegramId, locale, keyboard);
  }

  async handleThreeDays(telegramId: number, locale: LocaleId, keyboard: InlineKeyboard) {
    const text = this.localService.i18n.t(locale, 'user-not-connected-72');

    await safeSendMessage(this.bot, telegramId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async handleInitial(telegramId: number, locale: LocaleId, keyboard: InlineKeyboard) {
    const text = this.localService.i18n.t(locale, 'user-not-connected-24');

    await safeSendMessage(this.bot, telegramId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }
}
