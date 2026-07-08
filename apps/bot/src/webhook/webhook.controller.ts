import * as process from 'node:process';
import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebHookEvent } from '@remna/remna.model';
import { Payments, UserDto, WebhookEvent } from '@workspace/types';

/**
 * Receives pre-processed notifications from the backend services.
 * All webhook validation and business logic happens in the backend.
 * The bot only handles Telegram messaging.
 */
@Controller('notify')
export class NotificationController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Receives user lifecycle events from the backend (forwarded from Remnawave webhooks).
   * Events: user.expired, user.expires_in_24_hours, user.expired_24_hours_ago, user.not_connected
   */
  @Post('user-event')
  @HttpCode(200)
  async handleUserEvent(
    @Headers('x-bot-secret') secret: string,
    @Body()
    payload: {
      event: WebHookEvent;
      data: UserDto;
      timestamp: string;
    },
  ) {
    this.validateSecret(secret);
    this.eventEmitter.emit(payload.event, payload);
    return { ok: true };
  }

  /**
   * Receives payment result notifications from the backend.
   * Backend has already processed the payment, updated subscriptions, and triggered referral rewards.
   * Bot just sends the appropriate Telegram message.
   */
  @Post('payment')
  @HttpCode(200)
  async handlePaymentNotification(
    @Headers('x-bot-secret') secret: string,
    @Body()
    body: {
      eventType: WebhookEvent;
      payload: Payments.PaymentSucceededEventPayload | Payments.PaymentFailedEventPayload;
      user: UserDto;
    },
  ) {
    this.validateSecret(secret);
    this.eventEmitter.emit(`notify.${body.eventType}`, body);
    return { ok: true };
  }

  /**
   * Receives torrent detection events from the backend.
   */
  @Post('torrent')
  @HttpCode(200)
  async handleTorrentEvent(
    @Headers('x-bot-secret') secret: string,
    @Body()
    payload: {
      username: string;
      ip: string;
      server: string;
      action: string;
      duration: string;
      timestamp: string;
    },
  ) {
    this.validateSecret(secret);
    this.eventEmitter.emit('torrent.event', payload);
    return { ok: true };
  }

  /**
   * Receives referral reward notifications from the backend.
   */
  @Post('user-rewarded')
  @HttpCode(200)
  async handleUserRewarded(
    @Headers('x-bot-secret') secret: string,
    @Body()
    payload: {
      telegramId: number;
      role: 'inviter' | 'invited';
    },
  ) {
    this.validateSecret(secret);
    this.eventEmitter.emit('user.rewarded', payload);
    return { ok: true };
  }

  private validateSecret(secret: string) {
    const expected = process.env.BOT_NOTIFY_SECRET;
    if (!expected) {
      throw new UnauthorizedException('BOT_NOTIFY_SECRET is not configured');
    }
    if (secret !== expected) {
      throw new UnauthorizedException('Invalid notification secret');
    }
  }
}
