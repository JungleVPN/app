import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { safeSendMessage, toDateString } from '@bot/utils/utils';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebHookEvent } from '@remna/remna.model';
import { UserDto } from '@workspace/types';
import { Bot, InlineKeyboard } from 'grammy';

@Injectable()
export class UserExpireListener {
  bot: Bot<BotContext>;
  private readonly logger = new Logger(UserExpireListener.name);

  constructor(
    private readonly botService: BotService,
    private readonly localService: LocalisationService,
  ) {
    this.bot = this.botService.bot;
  }

  @OnEvent('user.expires_in_24_hours')
  async listenToUser24ExpiresEvent(payload: {
    event: WebHookEvent;
    data: UserDto;
    timestamp: string;
  }) {
    await this.handleUserExpireEvent(payload);
  }

  @OnEvent('user.expires_in_48_hours')
  async listenToUser48ExpiresEvent(payload: {
    event: WebHookEvent;
    data: UserDto;
    timestamp: string;
  }) {
    await this.handleUserExpireEvent(payload);
  }

  @OnEvent('user.expired')
  async listenToUserExpiresEvent(payload: {
    event: WebHookEvent;
    data: UserDto;
    timestamp: string;
  }) {
    await this.handleUserExpireEvent(payload);
  }

  @OnEvent('user.expired_24_hours_ago')
  async listenToUserExpires24Event(payload: {
    event: WebHookEvent;
    data: UserDto;
    timestamp: string;
  }) {
    await this.handleUserExpireEvent(payload);
  }

  async handleUserExpireEvent(payload: { event: WebHookEvent; data: UserDto; timestamp: string }) {
    const telegramId = payload.data.telegramId;
    if (!telegramId) {
      this.logger.warn(
        `Skipping expire notification: telegramId is null for event ${payload.event}`,
      );
      return;
    }

    const locale = payload.data.description || process.env.DEFAULT_LOCALE || 'ru';

    const keyboard = new InlineKeyboard();

    keyboard.webApp(
      this.localService.i18n.t(locale, 'pay-button-label'),
      process.env.PUBLIC_TMA_APP_PAYMENT_URL || 'https://app.thejungle.pro/payment',
    );
    keyboard.row();
    keyboard.url(
      this.localService.i18n.t(locale, 'support-button-label'),
      process.env.PUBLIC_SUPPORT_URL || 'https://t.me/JungleVPN_support',
    );
    keyboard.text(this.localService.i18n.t(locale, 'home-button-label'), 'navigate_main');

    const formattedDate = toDateString(payload.data.expireAt);
    const translationKey = this.getTranslationKey(payload.event);

    const text = this.localService.i18n.t(locale, translationKey, {
      formattedDate,
    });

    await safeSendMessage(this.bot, telegramId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  getTranslationKey(event: WebHookEvent) {
    switch (event) {
      case 'user.expired':
        return 'expired-subscription-text';
      case 'user.expires_in_48_hours':
        return 'expires-in-48-hours-subscription-text';
      case 'user.expires_in_24_hours':
        return 'expires-in-24-hours-subscription-text';
      case 'user.expired_24_hours_ago':
        return 'expired-24-hours-ago-subscription-text';
      default:
        return 'expired-subscription-text';
    }
  }
}
