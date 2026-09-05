import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import {
  buildNotConnectedEmailHtml,
  buildNotConnectedEmailSubject,
  NotConnectedEmailLocale,
  NotConnectedEmailStage,
} from '@bot/notifications/user-not-connected-email-templates';
import { ZohoEmailService } from '@bot/notifications/zoho-email.service';
import { safeSendMessage } from '@bot/utils/utils';
import { LocaleId } from '@grammyjs/i18n';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebHookEvent } from '@remna/remna.model';
import { RemnaService } from '@remna/remna.service';
import { UserDto } from '@workspace/types';
import { Bot, InlineKeyboard } from 'grammy';

const SECOND_STAGE_HOURS = 48;

type NotConnectedPayload = {
  event: WebHookEvent;
  data: UserDto;
  timestamp: string;
  meta?: { expiration?: number | null } | null;
};

@Injectable()
export class UserNotConnectedListener {
  bot: Bot<BotContext>;
  private readonly logger = new Logger(UserNotConnectedListener.name);

  constructor(
    readonly botService: BotService,
    readonly localService: LocalisationService,
    readonly remnaService: RemnaService,
    readonly zohoEmailService: ZohoEmailService,
  ) {
    this.bot = this.botService.bot;
  }

  @OnEvent('user.not_connected')
  async listenToUserNotConnectedEvent(payload: NotConnectedPayload) {
    const locale =
      (payload.data.id != null ? await this.remnaService.getUserLang(payload.data.id) : null) ||
      (process.env.DEFAULT_LOCALE as LocaleId);
    const stage = this.resolveStage(payload.meta?.expiration ?? null);

    const keyboard = new InlineKeyboard()
      .webApp(
        this.localService.i18n.t(locale, 'profile-button-label'),
        process.env.TMA_APP_URL || 'https://app.thejungle.pro',
      )
      .text(this.localService.i18n.t(locale, 'home-button-label'), 'navigate_main')
      .row()
      .url(
        this.localService.i18n.t(locale, 'support-button-label'),
        process.env.SUPPORT_TG_URL || 'https://t.me/JungleVPN_support_bot',
      );

    if (payload.data.telegramId) {
      if (stage === 48) {
        await this.handle48Hours(payload.data.telegramId, locale, keyboard);
      } else {
        await this.handle24Hours(payload.data.telegramId, locale, keyboard);
      }
    } else {
      this.logger.warn('Skipping not-connected bot message: telegramId is null');
    }

    await this.sendNotConnectedEmail(payload.data, locale, stage);
  }

  private resolveStage(expirationHours: number | null): NotConnectedEmailStage {
    return expirationHours !== null && expirationHours >= SECOND_STAGE_HOURS ? 48 : 24;
  }

  async handle48Hours(telegramId: number, locale: LocaleId, keyboard: InlineKeyboard) {
    const text = this.localService.i18n.t(locale, 'user-not-connected-48');

    await safeSendMessage(this.bot, telegramId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async handle24Hours(telegramId: number, locale: LocaleId, keyboard: InlineKeyboard) {
    const text = this.localService.i18n.t(locale, 'user-not-connected-24');

    await safeSendMessage(this.bot, telegramId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async sendNotConnectedEmail(
    user: UserDto,
    locale: LocaleId,
    stage: NotConnectedEmailStage,
  ): Promise<void> {
    if (!this.zohoEmailService.hasCredentials) {
      this.logger.warn('Zoho credentials not configured, skipping not-connected email');
      return;
    }

    const email = user.email;
    if (!email) {
      this.logger.log(`Skipping not-connected email: no email address for userId=${user.id}`);
      return;
    }

    const emailLocale: NotConnectedEmailLocale = locale === 'en' ? 'en' : 'ru';
    const subject = buildNotConnectedEmailSubject(emailLocale, stage);
    const html = buildNotConnectedEmailHtml({
      locale: emailLocale,
      stage,
      appUrl: process.env.PUBLIC_WEB_APP_URL || 'https://thejungle.pro',
      supportUrl: process.env.SUPPORT_EMAIL || 'support@jungle-vpn.com',
    });

    try {
      await this.zohoEmailService.sendEmail(email, subject, html);
      this.logger.log(`Not-connected email (${stage}h) sent to userId=${user.id} email=${email}`);
    } catch (err: unknown) {
      const detail = this.zohoEmailService.describeError(err);
      this.logger.error(
        `Failed to send not-connected email (${stage}h) to userId=${user.id} email=${email}: ${detail}`,
      );
    }
  }
}
