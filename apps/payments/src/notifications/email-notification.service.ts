import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { apiRoutes, GetUserByIdResponseDto, Payments, WebhookEventEnum } from '@workspace/types';
import axios, { isAxiosError } from 'axios';
import {
  buildExpiryEmailHtml,
  buildExpirySubject,
  buildPaymentIssueEmailHtml,
  buildPaymentIssueSubject,
  buildPaymentSuccessEmailHtml,
  buildPaymentSuccessSubject,
  ExpiryEmailLocale,
  isSupportedEmailLocale,
  PaymentIssueReason,
} from './email-templates';

type SupportedLocale = ExpiryEmailLocale;
type ExpiryHours = 24 | 48;
const PROFILE_SUBSCRIPTION_PATH = '/profile/subscription';

// ── Date formatting ───────────────────────────────────────────────────────────

function toDateString(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('ru-EU', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}

const EXPIRY_DAYS: Record<ExpiryHours, number> = { 24: 1, 48: 2 };

const DEFAULT_LOCALE: SupportedLocale = 'en';

// ── Service ───────────────────────────────────────────────────────────────────

interface ZohoAccessToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private accessTokenCache: ZohoAccessToken | null = null;

  private get clientId(): string | undefined {
    return process.env.ZOHO_CLIENT_ID;
  }

  private get clientSecret(): string | undefined {
    return process.env.ZOHO_CLIENT_SECRET;
  }

  private get refreshToken(): string | undefined {
    return process.env.ZOHO_REFRESH_TOKEN;
  }

  private get accountId(): string | undefined {
    return process.env.ZOHO_ACCOUNT_ID;
  }

  private get fromEmail(): string {
    return process.env.ZOHO_FROM_EMAIL ?? 'notification@jungle-vpn.com';
  }

  private get fromName(): string {
    return process.env.ZOHO_FROM_NAME ?? 'JungleVPN Subscription';
  }

  private get fromAddress(): string {
    return `"${this.fromName}" <${this.fromEmail}>`;
  }

  private get apiDomain(): string {
    return process.env.ZOHO_API_DOMAIN ?? 'zoho.eu';
  }

  /**
   * The subscription-management page, on the domain matching the user's
   * `metadata.lang` — RU for a Russian-speaking user, the global domain
   * otherwise. Never derived from PUBLIC_WEB_APP_URL/TMA_APP_URL, which
   * don't identify which storefront a user belongs to.
   */
  private siteUrlFor(locale: SupportedLocale): string {
    const domain =
      locale === 'ru' ? process.env.PUBLIC_DOMAIN_RU : process.env.PUBLIC_DOMAIN_GLOBAL;
    if (domain) return `https://${domain}${PROFILE_SUBSCRIPTION_PATH}`;
    return process.env.RETURN_URL_WEB ?? 'https://t.me';
  }

  private get supportUrl(): string {
    return `mailto:${process.env.SUPPORT_EMAIL}`;
  }

  private get hasZohoCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken && this.accountId);
  }

  @OnEvent(WebhookEventEnum['payment.expiry_reminder'])
  async onExpiryReminder(event: Payments.PaymentExpiryReminderEventPayload): Promise<void> {
    const { userId, hoursRemaining } = event;

    if (!this.hasZohoCredentials) {
      this.logger.warn('Zoho credentials not configured, skipping email notification');
      return;
    }

    const user = await this.getUserById(userId);
    if (!user?.email) {
      this.logger.log(
        `Skipping expiry email: no email address for userId=${userId} (${hoursRemaining}h)`,
      );
      return;
    }

    const locale = await this.resolveLocale(userId);
    const expireDate = toDateString(user.expireAt);
    const days = EXPIRY_DAYS[hoursRemaining];
    const subject = buildExpirySubject(locale, days);
    const html = buildExpiryEmailHtml({
      locale,
      days,
      expireDate,
      paymentUrl: this.siteUrlFor(locale),
      supportUrl: this.supportUrl,
    });

    try {
      await this.sendViaZoho(user.email, subject, html);

      this.logger.log(
        `Expiry email (${hoursRemaining}h) sent to userId=${userId} email=${user.email}`,
      );
    } catch (err: unknown) {
      const detail = this.describeError(err);

      this.logger.error(
        `Failed to send expiry email (${hoursRemaining}h) to userId=${userId} email=${user.email}: ${detail}`,
      );
    }
  }

  @OnEvent(WebhookEventEnum['payment.succeeded'])
  async onPaymentSucceeded(event: Payments.PaymentSucceededEventPayload): Promise<void> {
    const { userId } = event;

    if (!this.hasZohoCredentials) {
      this.logger.warn('Zoho credentials not configured, skipping email notification');
      return;
    }

    const user = await this.getUserById(userId);
    if (!user?.email) {
      this.logger.log(`Skipping payment success email: no email address for userId=${userId}`);
      return;
    }

    const locale = await this.resolveLocale(userId);
    const expireDate = toDateString(user.expireAt);
    const subject = buildPaymentSuccessSubject(locale);
    const html = buildPaymentSuccessEmailHtml({
      locale,
      expireDate,
      paymentUrl: this.siteUrlFor(locale),
      supportUrl: this.supportUrl,
    });

    try {
      await this.sendViaZoho(user.email, subject, html);

      this.logger.log(`Email sent email=${user.email}, reason=payment.succeeded`);
    } catch (err: unknown) {
      const detail = this.describeError(err);

      this.logger.error(`Failed to send payment success email to userId=${userId}: ${detail}`);
    }
  }

  @OnEvent(WebhookEventEnum['payment.no_active_method'])
  async onNoActiveMethod(event: Payments.PaymentFailedEventPayload): Promise<void> {
    await this.notifyPaymentIssue(event.userId, 'no_active_method');
  }

  @OnEvent(WebhookEventEnum['payment.insufficient_funds'])
  async onInsufficientFunds(event: Payments.PaymentFailedEventPayload): Promise<void> {
    await this.notifyPaymentIssue(event.userId, 'insufficient_funds');
  }

  private async notifyPaymentIssue(userId: number, reason: PaymentIssueReason): Promise<void> {
    if (!this.hasZohoCredentials) {
      this.logger.warn('Zoho credentials not configured, skipping email notification');
      return;
    }

    const user = await this.getUserById(userId);
    if (!user?.email) {
      this.logger.log(`Skipping ${reason} email: no email address for userId=${userId}`);
      return;
    }

    const locale = await this.resolveLocale(userId);
    const expireDate = toDateString(user.expireAt);
    const subject = buildPaymentIssueSubject(locale, reason);
    const html = buildPaymentIssueEmailHtml({
      locale,
      reason,
      expireDate,
      paymentUrl: this.siteUrlFor(locale),
      supportUrl: this.supportUrl,
    });

    try {
      await this.sendViaZoho(user.email, subject, html);

      this.logger.log(`Email sent to email=${user.email}, reason=${reason ?? 'unknown'}`);
    } catch (err: unknown) {
      const detail = this.describeError(err);

      this.logger.error(`Failed to send ${reason} email to userId=${userId}: ${detail}`);
    }
  }

  private async getUserById(userId: number): Promise<GetUserByIdResponseDto | null> {
    try {
      const { data } = await axios.get<GetUserByIdResponseDto>(
        `${this.remnawaveBaseUrl}${apiRoutes.remnawave.userById(userId)}`,
        {
          headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
          timeout: 5_000,
        },
      );
      return data;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch user by id ${userId}: ${detail}`);
      return null;
    }
  }

  private async sendViaZoho(toEmail: string, subject: string, html: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    try {
      await this.postMessage(accessToken, toEmail, subject, html);
    } catch (err: unknown) {
      if (!isAxiosError(err) || err.response?.status !== 401) {
        throw err;
      }

      this.accessTokenCache = null;
      const refreshedToken = await this.getAccessToken();
      await this.postMessage(refreshedToken, toEmail, subject, html);
    }
  }

  private postMessage(
    accessToken: string,
    toEmail: string,
    subject: string,
    html: string,
  ): Promise<unknown> {
    return axios.post(
      `https://mail.${this.apiDomain}/api/accounts/${this.accountId}/messages`,
      {
        fromAddress: this.fromAddress,
        toAddress: toEmail,
        subject,
        content: html,
        askReceipt: 'no',
      },
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      },
    );
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessTokenCache && Date.now() < this.accessTokenCache.expiresAt - 60_000) {
      return this.accessTokenCache.token;
    }

    const { data } = await axios.post<{ access_token: string; expires_in: number }>(
      `https://accounts.${this.apiDomain}/oauth/v2/token`,
      null,
      {
        params: {
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        },
      },
    );

    this.accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.accessTokenCache.token;
  }

  private describeError(err: unknown): string {
    if (isAxiosError(err)) {
      const zohoDetail =
        err.response?.data?.data?.errorCode ?? err.response?.data?.status?.description;
      return `${err.message} ${zohoDetail ?? ''}`.trim();
    }
    return err instanceof Error ? err.message : String(err);
  }

  private get remnawaveBaseUrl(): string {
    return process.env.REMNAWAVE_URL || 'http://localhost:3002/remnawave';
  }

  private async resolveLocale(userId: number): Promise<SupportedLocale> {
    try {
      const { data } = await axios.get<Record<string, unknown>>(
        `${this.remnawaveBaseUrl}${apiRoutes.remnawave.userMetadata(userId)}`,
        {
          headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
          timeout: 5_000,
        },
      );

      const metadata = (data as any)?.metadata ?? data;
      const lang = (metadata as any)?.lang;
      if (typeof lang === 'string' && isSupportedEmailLocale(lang)) return lang;
    } catch {
      // fall through to default
    }
    return DEFAULT_LOCALE;
  }
}
