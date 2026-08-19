import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  apiRoutes,
  GetUserByUuidResponseDto,
  Payments,
  RemnawebhookPayload,
  WebhookEventEnum,
} from '@workspace/types';
import axios, { isAxiosError } from 'axios';
import {
  buildExpiryEmailHtml,
  buildExpirySubject,
  buildPaymentIssueEmailHtml,
  buildPaymentIssueSubject,
  ExpiryEmailLocale,
  PaymentIssueReason,
} from './email-templates';

type UserData = RemnawebhookPayload['data'];
type SupportedLocale = ExpiryEmailLocale;
type ExpiryHours = 24 | 48;

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

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale === 'en' || locale === 'ru';
}

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

  private get apiDomain(): string {
    return process.env.ZOHO_API_DOMAIN ?? 'zoho.eu';
  }

  private get paymentUrl(): string {
    return process.env.WEB_PAYMENT_URL ?? 'https://t.me';
  }

  private get supportUrl(): string {
    return process.env.PUBLIC_SUPPORT_EMAIL ?? 'https://t.me';
  }

  private get hasZohoCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken && this.accountId);
  }

  async notifyExpiry(user: UserData, hoursRemaining: ExpiryHours): Promise<void> {
    if (!this.hasZohoCredentials) {
      this.logger.warn('Zoho credentials not configured, skipping email notification');
      return;
    }

    if (!user.email) {
      this.logger.log(
        `Skipping expiry email: no email address for userId=${user.uuid} (${hoursRemaining}h)`,
      );
      return;
    }

    const locale = await this.resolveLocale(user.uuid);
    const expireDate = toDateString(user.expireAt);
    const days = EXPIRY_DAYS[hoursRemaining];
    const subject = buildExpirySubject(locale, days);
    const html = buildExpiryEmailHtml({
      locale,
      days,
      expireDate,
      paymentUrl: this.paymentUrl,
      supportUrl: this.supportUrl,
    });

    this.logger.log(
      `Sending ${hoursRemaining}h expiry email (locale=${locale}) to userId=${user.uuid}`,
    );

    try {
      await this.sendViaZoho(user.email, subject, html);

      this.logger.log(
        `Expiry email (${hoursRemaining}h) sent to userId=${user.uuid} email=${user.email}`,
      );
    } catch (err: unknown) {
      const detail = this.describeError(err);

      this.logger.error(
        `Failed to send expiry email (${hoursRemaining}h) to userId=${user.uuid} email=${user.email}: ${detail}`,
      );
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

  private async notifyPaymentIssue(userId: string, reason: PaymentIssueReason): Promise<void> {
    if (!this.hasZohoCredentials) {
      this.logger.warn('Zoho credentials not configured, skipping email notification');
      return;
    }

    const user = await this.getUserByUuid(userId);
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
      paymentUrl: this.paymentUrl,
      supportUrl: this.supportUrl,
    });

    this.logger.log(`Sending ${reason} email (locale=${locale}) to userId=${userId}`);

    try {
      await this.sendViaZoho(user.email, subject, html);

      this.logger.log(`${reason} email sent to userId=${userId} email=${user.email}`);
    } catch (err: unknown) {
      const detail = this.describeError(err);

      this.logger.error(`Failed to send ${reason} email to userId=${userId}: ${detail}`);
    }
  }

  private async getUserByUuid(uuid: string): Promise<GetUserByUuidResponseDto | null> {
    try {
      const { data } = await axios.get<GetUserByUuidResponseDto>(
        `${this.remnawaveBaseUrl}${apiRoutes.remnawave.userByUuid(uuid)}`,
        {
          headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
          timeout: 5_000,
        },
      );
      return data;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch user by uuid ${uuid}: ${detail}`);
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
      { fromAddress: this.fromEmail, toAddress: toEmail, subject, content: html, askReceipt: 'no' },
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

  private async resolveLocale(uuid: string): Promise<SupportedLocale> {
    try {
      const { data } = await axios.get<Record<string, unknown>>(
        `${this.remnawaveBaseUrl}${apiRoutes.remnawave.userMetadata(uuid)}`,
        {
          headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
          timeout: 5_000,
        },
      );
      const lang = (data as any)?.lang;
      if (typeof lang === 'string' && isSupportedLocale(lang)) return lang;
    } catch {
      // fall through to default
    }
    return DEFAULT_LOCALE;
  }
}
