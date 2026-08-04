import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { apiRoutes } from '@workspace/types';
import axios from 'axios';
import { REFERRALS_EVENTS, type ReferralRewardedEvent } from './referrals-events';

/**
 * Listens for payment events and dispatches notifications to external receivers.
 *
 * Currently notifies the bot via HTTP.
 * Extensible: add more @OnEvent handlers or receiver methods (e.g. email)
 * without touching the webhook services that emit events.
 */
@Injectable()
export class ReferralsNotificationService {
  private readonly logger = new Logger(ReferralsNotificationService.name);

  private get botBaseUrl(): string {
    return process.env.PUBLIC_BOT_URL || 'http://localhost:7080/bot';
  }

  private get botNotifySecret(): string {
    return process.env.BOT_NOTIFY_SECRET || '';
  }

  @OnEvent(REFERRALS_EVENTS.REWARDED)
  async onFirstInvite(event: ReferralRewardedEvent): Promise<void> {
    await this.notifyBot(event);
    // Future: await this.notifyEmail(event);
  }

  /**
   * Sends payment notification to the bot's /notify/user-rewarded endpoint.
   */
  private async notifyBot(event: ReferralRewardedEvent): Promise<void> {
    if (!event.telegramId) {
      this.logger.error(
        `Cannot notify bot about user-rewarded: missing telegramId in event ${JSON.stringify(event)}`,
      );
      return;
    }

    try {
      await axios.post(`${this.botBaseUrl}${apiRoutes.bot.notifyUserRewarded}`, event, {
        headers: {
          'Content-Type': 'application/json',
          'x-bot-secret': this.botNotifySecret,
        },
        timeout: 5_000,
      });

      this.logger.log(
        `Bot notified userId=${event.userId} telegramId=${event.telegramId ?? 'null'}, reason=user-rewarded`,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to notify bot about user-rewarded for telegramId=${event.telegramId}: ${err.message}`,
      );
    }
  }
}
