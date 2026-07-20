import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { safeSendMessage, toDateString } from '@bot/utils/utils';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebHookEvent } from '@remna/remna.model';
import { RemnaService } from '@remna/remna.service';
import { UserDto } from '@workspace/types';
import { Bot, InlineKeyboard } from 'grammy';

type ExpirationPayload = {
  event: WebHookEvent;
  data: UserDto;
  timestamp: string;
  meta?: { expiration?: number | null } | null;
};

@Injectable()
export class UserExpireListener {
  bot: Bot<BotContext>;
  private readonly logger = new Logger(UserExpireListener.name);

  constructor(
    private readonly botService: BotService,
    private readonly localService: LocalisationService,
    private readonly remnaService: RemnaService,
  ) {
    this.bot = this.botService.bot;
  }

  @OnEvent('user.expired')
  async listenToUserExpiredEvent(payload: ExpirationPayload) {
    await this.handleUserExpireEvent(payload);
  }

  @OnEvent('user.expiration')
  async listenToUserExpirationEvent(payload: ExpirationPayload) {
    await this.handleUserExpireEvent(payload);
  }

  async handleUserExpireEvent(payload: ExpirationPayload) {
    const telegramId = payload.data.telegramId;

    const locale =
      (payload.data.uuid ? await this.remnaService.getUserLang(payload.data.uuid) : null) ||
      process.env.DEFAULT_LOCALE ||
      'ru';

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

    const formattedDate = toDateString(payload.data.expireAt);
    const translationKey = this.getTranslationKey(payload.event, payload.meta?.expiration ?? null);

    const text = this.localService.i18n.t(locale, translationKey, {
      formattedDate,
    });

    if (telegramId) {
      await safeSendMessage(this.bot, telegramId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  }

  getTranslationKey(event: WebHookEvent, expirationHours: number | null): string {
    if (event === 'user.expired') {
      return 'expired-subscription-text';
    }

    if (event === 'user.expiration') {
      if (expirationHours === null) return 'expired-subscription-text';
      if (expirationHours >= 48) return 'expired-48-hours-ago-subscription-text';
      if (expirationHours > 0) return 'expired-24-hours-ago-subscription-text';
      if (expirationHours >= -24) return 'expires-in-24-hours-subscription-text';
      return 'expires-in-48-hours-subscription-text';
    }

    return 'expired-subscription-text';
  }
}
