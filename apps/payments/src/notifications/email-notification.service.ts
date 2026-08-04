import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { apiRoutes, RemnawebhookPayload } from '@workspace/types';
import axios, { isAxiosError } from 'axios';

type UserData = RemnawebhookPayload['data'];
type SupportedLocale = 'en' | 'ru';
type ExpiryHours = 24 | 48;

interface EmailContent {
  subject: string;
  html: string;
}

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

// ── Email templates ───────────────────────────────────────────────────────────

function buildEmailHtml(
  body: string,
  paymentUrl: string,
  ctaLabel: string,
  supportUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">
        <tr><td style="padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;color:#111827;font-size:16px;line-height:1.6">
          ${body}
          <p style="margin:24px 0 0">
            <a href="${paymentUrl}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px">${ctaLabel}</a>
          </p>
          <p style="margin:24px 0 0;font-size:14px;color:#6b7280">
            <a href="${supportUrl}" style="color:#6b7280">Support</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

type TemplateFactory = (expireDate: string, paymentUrl: string, supportUrl: string) => EmailContent;

const EMAIL_TEMPLATES: Record<SupportedLocale, Record<ExpiryHours, TemplateFactory>> = {
  en: {
    24: (expireDate, paymentUrl, supportUrl) => ({
      subject: 'Your subscription expires in 1 day',
      html: buildEmailHtml(
        `<p style="margin:0 0 16px">Your subscription expires in <strong>1 day</strong> 🥲</p>
         <p style="margin:0 0 8px">End date is</p>
         <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f3f4f6;border-left:4px solid #16a34a;border-radius:4px;font-weight:600">${expireDate}</blockquote>
         <p style="margin:0 0 16px">Last chance — renew today to avoid losing access.</p>
         <p style="margin:0">Jungle 🌴</p>`,
        paymentUrl,
        'Renew subscription',
        supportUrl,
      ),
    }),
    48: (expireDate, paymentUrl, supportUrl) => ({
      subject: 'Your subscription expires in 2 days',
      html: buildEmailHtml(
        `<p style="margin:0 0 16px">Your subscription expires in <strong>2 days</strong> 🌴</p>
         <p style="margin:0 0 8px">End date is</p>
         <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f3f4f6;border-left:4px solid #16a34a;border-radius:4px;font-weight:600">${expireDate}</blockquote>
         <p style="margin:0 0 16px">Renew now to stay connected without interruption.</p>
         <p style="margin:0">Jungle 🌴</p>`,
        paymentUrl,
        'Renew subscription',
        supportUrl,
      ),
    }),
  },
  ru: {
    24: (expireDate, paymentUrl, supportUrl) => ({
      subject: 'Твоя подписка закончится через 1 день',
      html: buildEmailHtml(
        `<p style="margin:0 0 16px">Твоя подписка закончится через <strong>1 день</strong> 🥲</p>
         <p style="margin:0 0 8px">Будет работать до</p>
         <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f3f4f6;border-left:4px solid #16a34a;border-radius:4px;font-weight:600">${expireDate}</blockquote>
         <p style="margin:0 0 16px">Телеграм может быть недоступен — продли сегодня, чтобы не потерять доступ.</p>
         <p style="margin:0">Jungle 🌴</p>`,
        paymentUrl,
        'Продлить подписку',
        supportUrl,
      ),
    }),
    48: (expireDate, paymentUrl, supportUrl) => ({
      subject: 'Твоя подписка закончится через 2 дня',
      html: buildEmailHtml(
        `<p style="margin:0 0 16px">Твоя подписка закончится через <strong>2 дня</strong> 🌴</p>
         <p style="margin:0 0 8px">Будет работать до</p>
         <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f3f4f6;border-left:4px solid #16a34a;border-radius:4px;font-weight:600">${expireDate}</blockquote>
         <p style="margin:0 0 16px">Продли заранее, чтобы не терять доступ.</p>
         <p style="margin:0">Jungle 🌴</p>`,
        paymentUrl,
        'Продлить подписку',
        supportUrl,
      ),
    }),
  },
};

const DEFAULT_LOCALE: SupportedLocale = 'en';

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale in EMAIL_TEMPLATES;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  private get apiKey(): string | undefined {
    return process.env.RESEND_API_KEY;
  }

  private get fromEmail(): string {
    return process.env.RESEND_FROM_EMAIL ?? 'noreply@contact.thejungle.pro';
  }

  private get paymentUrl(): string {
    return process.env.WEB_PAYMENT_URL ?? 'https://t.me';
  }

  private get supportUrl(): string {
    return process.env.PUBLIC_SUPPORT_URL ?? 'https://t.me';
  }

  async notifyExpiry(user: UserData, hoursRemaining: ExpiryHours): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY is not set — skipping email notification');
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
    const { subject, html } = EMAIL_TEMPLATES[locale][hoursRemaining](
      expireDate,
      this.paymentUrl,
      this.supportUrl,
    );

    this.logger.log(
      `Sending ${hoursRemaining}h expiry email (locale=${locale}) to userId=${user.uuid}`,
    );

    try {
      await axios.post(
        'https://api.resend.com/emails',
        { from: this.fromEmail, to: [user.email], subject, html },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );

      this.logger.log(
        `Expiry email (${hoursRemaining}h) sent to userId=${user.uuid} email=${user.email}`,
      );
    } catch (err: unknown) {
      const detail = isAxiosError(err)
        ? `${err.message} ${err.response?.data != null ? JSON.stringify(err.response.data) : ''}`
        : err instanceof Error
          ? err.message
          : String(err);

      this.logger.error(
        `Failed to send expiry email (${hoursRemaining}h) to userId=${user.uuid} email=${user.email}: ${detail}`,
      );
    }
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
