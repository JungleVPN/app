import * as process from 'node:process';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  GetUserByUuidResponseDto,
  Payments,
  WebhookEvent,
  WebhookEventEnum,
} from '@workspace/types';
import axios, { isAxiosError } from 'axios';

/**
 * Listens for payment events and dispatches notifications to external receivers.
 *
 * Currently notifies the bot via HTTP.
 * Extensible: add more @OnEvent handlers or receiver methods (e.g. email)
 * without touching the webhook services that emit events.
 */
@Injectable()
export class BotNotificationService {
  private readonly logger = new Logger(BotNotificationService.name);

  private get botBaseUrl(): string {
    return process.env.PUBLIC_BOT_URL || 'http://localhost:7080';
  }

  private get botNotifySecret(): string {
    return process.env.BOT_NOTIFY_SECRET || '';
  }

  private get remnawareBaseUrl(): string {
    return process.env.PUBLIC_REMNAWAVE_URL || 'http://localhost:3002';
  }

  private async getUserByUuid(uuid: string): Promise<GetUserByUuidResponseDto> {
    if (!uuid) {
      throw new NotFoundException('User id is required to notify bot');
    }

    try {
      const { data } = await axios.get<GetUserByUuidResponseDto | null>(
        `${this.remnawareBaseUrl}/users/${uuid}`,
        {
          headers: {
            'x-service-secret': process.env.INTER_SERVICE_SECRET,
          },
        },
      );
      if (!data) {
        throw new NotFoundException(`User not found: ${uuid}`);
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      if (isAxiosError(err) && err.response?.status === 404) {
        throw new NotFoundException(`User not found: ${uuid}`);
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch user by uuid ${uuid}: ${message}`);
      throw err;
    }
  }

  @OnEvent(WebhookEventEnum['payment.succeeded'])
  async onPaymentSucceeded(event: Payments.PaymentSucceededEventPayload): Promise<void> {
    await this.notify('payment.succeeded', event);
  }

  @OnEvent(WebhookEventEnum['payment.autopayment_exhausted'])
  async onAutopaymentExhausted(event: Payments.PaymentFailedEventPayload): Promise<void> {
    await this.notify('payment.autopayment_exhausted', event);
  }

  @OnEvent(WebhookEventEnum['payment.autopayment_failed'])
  async onAutopaymentFailed(event: Payments.PaymentFailedEventPayload): Promise<void> {
    await this.notify('payment.autopayment_failed', event);
  }

  @OnEvent(WebhookEventEnum['payment.canceled'])
  async onCancel(event: Payments.PaymentFailedEventPayload): Promise<void> {
    await this.notify('payment.canceled', event);
  }

  @OnEvent(WebhookEventEnum['payment.no_active_method'])
  async onNoActiveMethods(event: Payments.PaymentFailedEventPayload): Promise<void> {
    await this.notify('payment.no_active_method', event);
  }

  /**
   * Sends payment notification to the bot's /notify/payment endpoint.
   * Loads the user from remnawave and includes it in the body. Throws if the user does not exist.
   * HTTP errors from the bot are logged and do not propagate.
   */
  public async notify(
    eventType: WebhookEvent,
    payload: Payments.PaymentSucceededEventPayload | Payments.PaymentFailedEventPayload,
  ): Promise<void> {
    const user = await this.getUserByUuid(payload.userId);

    if (!user.telegramId) {
      this.logger.warn(
        `No telegram id found. Skipping bot notification for userId=${payload.userId}`,
      );
      return;
    }

    try {
      await axios.post(
        `${this.botBaseUrl}/notify/payment`,
        {
          eventType,
          payload,
          user,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-bot-secret': this.botNotifySecret,
          },
          timeout: 5_000,
        },
      );

      this.logger.log(
        `Bot notified userId=${payload.userId} telegramId=${user.telegramId ?? 'n/a'}, reason=${eventType ?? 'unknown'}`,
      );
    } catch (err: unknown) {
      const detail = isAxiosError(err)
        ? `${err.message} ${err.response?.data != null ? JSON.stringify(err.response.data) : ''}`
        : err instanceof Error
          ? err.message
          : err;
      this.logger.warn(
        `Failed to notify bot about ${eventType} for userId=${payload.userId}: ${detail}`,
      );
    }
  }
}
