import * as process from 'node:process';
import { BotService } from '@bot/bot.service';
import { BotContext } from '@bot/bot.types';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { safeSendMessage, toDateString } from '@bot/utils/utils';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Payments } from '@shared/payments';
import { UserDto } from '@workspace/types';
import { Bot, InlineKeyboard } from 'grammy';

/**
 * Mapping from YooKassa `CancelReason` to the localisation key we show the
 * user. Reasons are grouped by what action the user is expected to take so
 * we don't end up with 20 near-identical translation strings.
 */
const CANCEL_REASON_I18N_KEY: Record<Payments.CancelReason, string> = {
  insufficient_funds: 'payment-failed-insufficient-funds-text',
  card_expired: 'payment-failed-card-expired-text',
  invalid_card_number: 'payment-failed-invalid-card-text',
  invalid_csc: 'payment-failed-invalid-card-text',
  '3d_secure_failed': 'payment-failed-3ds-text',
  fraud_suspected: 'payment-failed-fraud-text',
  call_issuer: 'payment-failed-issuer-text',
  issuer_unavailable: 'payment-failed-issuer-text',
  payment_method_restricted: 'payment-failed-issuer-text',
  payment_method_limit_exceeded: 'payment-failed-limit-text',
  country_forbidden: 'payment-failed-country-text',
  unsupported_mobile_operator: 'payment-failed-country-text',
  identification_required: 'payment-failed-identification-text',
  expired_on_capture: 'payment-failed-expired-text',
  expired_on_confirmation: 'payment-failed-expired-text',
  deal_expired: 'payment-failed-expired-text',
  internal_timeout: 'payment-failed-timeout-text',
  permission_revoked: 'payment-failed-permission-revoked-text',
  canceled_by_merchant: 'payment-failed-text',
  general_decline: 'payment-failed-text',
  no_active_method: 'no-active-method-text',
};

/** Generic fallback used for unknown / missing reasons. */
const DEFAULT_FAILURE_I18N_KEY = 'payment-failed-text';

/**
 * Handles payment notifications from the backend.
 * All business logic (subscription updates, referral rewards) is handled by the backend.
 * This listener only sends Telegram messages to the user.
 */
@Injectable()
export class PaymentStatusListener {
  bot: Bot<BotContext>;
  logger = new Logger(PaymentStatusListener.name);

  constructor(
    private readonly botService: BotService,
    private readonly localService: LocalisationService,
  ) {
    this.bot = this.botService.bot;
  }

  @OnEvent('notify.payment.succeeded')
  async handlePaymentSucceeded(body: {
    payload: Payments.PaymentSucceededEventPayload | Payments.PaymentFailedEventPayload;
    user: UserDto;
  }) {
    const { user, payload } = body;
    const locale = user.description || process.env.DEFAULT_LOCALE || 'en';

    if (user.telegramId) {
      if (payload.provider === 'stripe') {
        await this.sendStripeSuccessMessage({
          telegramId: user.telegramId,
          invoiceUrl: payload.invoiceUrl,
          subscriptionUrl: user.subscriptionUrl,
          expireAt: user.expireAt,
          locale,
        });
      } else {
        await this.sendYookassaSuccessMessage(user, locale);
      }
    }
  }

  @OnEvent('notify.payment.no_active_method')
  handleNoActiveMethod(body: {
    payload: Payments.PaymentFailedEventPayload;
    user: UserDto;
  }): Promise<void> {
    return this.commonPaymentFailed(body);
  }
  @OnEvent('notify.payment.canceled')
  handlePaymentCanceled(body: {
    payload: Payments.PaymentFailedEventPayload;
    user: UserDto;
  }): Promise<void> {
    return this.commonPaymentFailed(body);
  }

  async commonPaymentFailed(body: {
    payload: Payments.PaymentFailedEventPayload;
    user: UserDto;
  }): Promise<void> {
    const { payload, user } = body;
    const locale = user.description || process.env.DEFAULT_LOCALE || 'en';
    const i18n = this.localService.i18n;

    const i18nKey = this.resolveFailureI18nKey(payload.reason);

    this.logger.log(
      `Notifying telegramId=${user.telegramId}, reason=${payload.reason ?? 'unknown'}`,
    );

    const text = i18n.t(locale, i18nKey);
    const menu = new InlineKeyboard()
      .webApp(
        i18n.t(locale, 'pay-button-label'),
        process.env.TMA_APP_PAYMENT_URL || 'https://app.thejungle.pro',
      )
      .row()
      .text(i18n.t(locale, 'profile-button-label'), 'navigate_to_profile');

    if (user.telegramId) {
      await safeSendMessage(this.bot, user.telegramId, text, {
        reply_markup: menu,
        parse_mode: 'HTML',
      });
    }
  }

  /**
   * Resolves the localisation key for a given cancellation reason, falling back
   * to the generic failure message for unknown or missing values.
   */
  private resolveFailureI18nKey(reason?: Payments.CancelReason | string): string {
    if (!reason) return DEFAULT_FAILURE_I18N_KEY;
    return CANCEL_REASON_I18N_KEY[reason as Payments.CancelReason] ?? DEFAULT_FAILURE_I18N_KEY;
  }

  private async sendYookassaSuccessMessage(user: UserDto, locale: string) {
    const i18n = this.localService.i18n;

    if (!user.telegramId) return;

    const successMenu = new InlineKeyboard()
      .webApp(
        i18n.t(locale, 'profile-button-label'),
        process.env.TMA_APP_URL || 'https://app.thejungle.pro',
      )
      .row()
      .text(i18n.t(locale, 'home-button-label'), 'navigate_main');

    await safeSendMessage(
      this.bot,
      user.telegramId,
      i18n.t(locale, 'payment-success-text', { expireAt: toDateString(user.expireAt) }),
      {
        reply_markup: successMenu,
      },
    );
  }

  private async sendStripeSuccessMessage({
    telegramId,
    locale,
    expireAt,
    invoiceUrl,
    subscriptionUrl,
  }: {
    telegramId: number;
    locale: string;
    expireAt: Date;
    invoiceUrl?: string;
    subscriptionUrl?: string;
  }) {
    const i18n = this.localService.i18n;
    const formattedDate = toDateString(expireAt);

    const text = i18n.t(locale, 'invoice-payment-success-text', {
      expireAt: formattedDate,
    });

    const successMenu = new InlineKeyboard()
      .webApp(
        this.localService.i18n.t(locale, 'profile-button-label'),
        process.env.TMA_APP_PAYMENT_URL || 'https://app.thejungle.pro',
      )
      .url(i18n.t(locale, 'invoice-button-label'), invoiceUrl || subscriptionUrl || '#')
      .row()
      .text(i18n.t(locale, 'home-button-label'), 'navigate_main');

    await safeSendMessage(this.bot, telegramId, text, {
      reply_markup: successMenu,
      parse_mode: 'HTML',
    });
  }
}
