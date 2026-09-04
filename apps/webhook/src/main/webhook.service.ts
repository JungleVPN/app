import process from 'node:process';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PaymentWebhookNotification, TRemnawaveWebhookEvent } from '@workspace/types';
import { apiRoutes, REMNAWAVE_EVENTS, REMNAWAVE_EVENTS_SCOPES } from '@workspace/types';
import axios from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  private get paymentsBaseUrl(): string {
    return this.configService.get<string>('PAYMENTS_URL', 'http://localhost:3001/payments');
  }

  private get botBaseUrl(): string {
    return this.configService.get<string>('BOT_URL', 'http://localhost:7080/bot');
  }

  /**
   * Processes a Remnawave event that has already been signature-verified by
   * RemnaSignatureGuard.  Do not call this directly without first validating
   * the HMAC signature.
   */
  async processRemnaEvent(payload: TRemnawaveWebhookEvent): Promise<void> {
    if (payload.scope !== REMNAWAVE_EVENTS_SCOPES.USER) return;

    const { event } = payload;

    if (event === REMNAWAVE_EVENTS.USER.EXPIRATION) {
      const hours = payload.meta?.expiration ?? null;
      if (hours === null) {
        this.logger.warn('Received user.expiration event without meta.expiration, skipping');
        return;
      }
      // Negative hours = before expiry → payments handles autopayment + email
      // Positive hours = after expiry → notify user directly via bot
      if (hours < 0) {
        await this.forwardRemnaEventToPayments(payload);
      } else {
        await this.forwardRemnaEventToBot(payload);
      }
      return;
    }

    if (
      event === REMNAWAVE_EVENTS.USER.EXPIRED ||
      event === REMNAWAVE_EVENTS.USER.NOT_CONNECTED ||
      event === REMNAWAVE_EVENTS.USER.FIRST_CONNECTED
    ) {
      await this.forwardRemnaEventToBot(payload);
    }
  }

  private async forwardRemnaEventToPayments(payload: TRemnawaveWebhookEvent): Promise<void> {
    try {
      await axios.post(`${this.paymentsBaseUrl}${apiRoutes.payments.remnawaveEvent}`, payload, {
        timeout: 10_000,
      });
    } catch (error: any) {
      this.logger.error(`Failed to forward remnawave event ${payload.event} to payments: ${error}`);
    }
  }

  private async forwardRemnaEventToBot(payload: TRemnawaveWebhookEvent): Promise<void> {
    try {
      await axios.post(`${this.botBaseUrl}${apiRoutes.bot.notifyUserEvent}`, payload, {
        headers: {
          'x-bot-secret': this.configService.get<string>('BOT_NOTIFY_SECRET', ''),
        },
        timeout: 10_000,
      });
    } catch (error: any) {
      this.logger.error(`Failed to forward remnawave event ${payload.event} to bot: ${error}`);
    }
  }

  validateAndProcessTorrent(
    token: string,
    payload: {
      username: string;
      ip: string;
      server: string;
      action: string;
      duration: string;
      timestamp: string;
    },
  ) {
    const expectedToken = this.configService.get<string>('REMNAWAVE_TORRENT_WEBHOOK_TOKEN', '');
    if (token !== expectedToken) {
      throw new BadRequestException('Invalid token');
    }

    this.eventEmitter.emit('torrent.event', payload);
  }

  async forwardStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    try {
      await axios.post(`${this.paymentsBaseUrl}${apiRoutes.payments.stripeWebhook}`, rawBody, {
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature,
          'x-service-secret': process.env.INTER_SERVICE_SECRET,
        },
        // Send raw buffer, don't let axios transform it
        transformRequest: [(data: Buffer) => data],
      });
    } catch (error) {
      this.logger.error('Failed to forward Stripe webhook to payments service', error);
      throw error;
    }
  }

  async forwardYookassaWebhook(payload: PaymentWebhookNotification, ip: string): Promise<void> {
    await axios.post(`${this.paymentsBaseUrl}${apiRoutes.payments.yookassaWebhook}`, payload, {
      headers: {
        'x-forwarded-for': ip,
        'x-service-secret': process.env.INTER_SERVICE_SECRET,
      },
      // Must exceed worst-case payments processing: 3 retries × (10 s remnawave timeout + 2 s delay) = 36 s.
      timeout: 40_000,
    });
  }
}
