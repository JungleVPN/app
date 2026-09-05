import * as process from 'node:process';
import { Injectable } from '@nestjs/common';
import axios, { isAxiosError } from 'axios';

interface ZohoAccessToken {
  token: string;
  expiresAt: number;
}

/**
 * Minimal Zoho Mail sender used for bot-originated notifications (e.g. the
 * user.not_connected reminder). Mirrors the OAuth/send mechanics of
 * apps/payments' EmailNotificationService — kept as a separate copy because
 * the two apps are independently deployed processes with no shared backend
 * package to hold this logic.
 */
@Injectable()
export class ZohoEmailService {
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
    return process.env.ZOHO_FROM_NAME ?? 'JungleVPN';
  }

  private get fromAddress(): string {
    return `"${this.fromName}" <${this.fromEmail}>`;
  }

  private get apiDomain(): string {
    return process.env.ZOHO_API_DOMAIN ?? 'zoho.eu';
  }

  get hasCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken && this.accountId);
  }

  async sendEmail(toEmail: string, subject: string, html: string): Promise<void> {
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

  describeError(err: unknown): string {
    if (isAxiosError(err)) {
      const zohoDetail =
        (err.response?.data as any)?.data?.errorCode ??
        (err.response?.data as any)?.status?.description;
      return `${err.message} ${zohoDetail ?? ''}`.trim();
    }
    return err instanceof Error ? err.message : String(err);
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
}
