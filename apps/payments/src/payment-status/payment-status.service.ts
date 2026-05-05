import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { GetUserByUuidResponseDto } from '@workspace/types';
import axios from 'axios';
import { addMonths } from 'date-fns';

/**
 * Orchestrates post-payment business logic via HTTP calls to other services.
 *
 * Lives in the payments app because payment events originate here.
 * Calls remnawave to extend user subscription, and referrals to trigger rewards.
 */
@Injectable()
export class PaymentStatusService {
  private readonly logger = new Logger(PaymentStatusService.name);

  private get remnawareBaseUrl(): string {
    return process.env.REMNAWAVE_URL || 'http://localhost:3002';
  }

  private get referralsBaseUrl(): string {
    return process.env.REFERRALS_URL || 'http://localhost:3004';
  }

  /**
   * Called after a successful payment (Stripe or Yookassa).
   * Looks up user by email (web), telegramId (bot), or userId (uuid), in that priority order.
   * 1. Fetches user from remnawave
   * 2. Extends subscription via remnawave PATCH /users
   * 3. Triggers referral reward via referrals POST /referrals/reward-after-payment
   */
  // ToDo remove and add update expiryData method on BE side
  async handlePaymentSucceeded({
    selectedPeriod,
    userId,
  }: {
    selectedPeriod: number;
    userId: string;
  }): Promise<{ success: boolean }> {
    const user = await this.getUserByUuid(userId);

    if (!user) {
      this.logger.warn(`User not found: userId=${userId}`);
      return { success: false };
    }

    // If the subscription is already expired, extend from today rather than
    // from the past expiry date.
    const base =
      user.expireAt && new Date(user.expireAt) > new Date() ? new Date(user.expireAt) : new Date();
    const newExpiry = addMonths(base, selectedPeriod);

    await this.updateUserExpiry(user.uuid, newExpiry);

    if (user.telegramId) {
      await this.triggerReferralReward(user.telegramId);
    }

    this.logger.log(`Payment processed for user ${user.uuid}: +${selectedPeriod} month(s)`);

    return { success: true };
  }

  private async getUserByUuid(uuid: string): Promise<GetUserByUuidResponseDto | null> {
    try {
      const { data } = await axios.get<GetUserByUuidResponseDto>(
        `${this.remnawareBaseUrl}/users/${uuid}`,
        {
          headers: {
            'x-service-secret': process.env.INTER_SERVICE_SECRET,
          },
        },
      );
      return data ?? null;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.error(`Failed to fetch user by uuid ${uuid}: ${err.message}`);
      throw err;
    }
  }

  private async updateUserExpiry(uuid: string, expireAt: Date): Promise<void> {
    // Retry up to 3 times with a 2-second gap between attempts.
    // A transient remnawave blip must not silently swallow a successful payment —
    // if all attempts fail the error is intentionally rethrown so the caller can
    // propagate a non-200 back to YooKassa and let it retry the webhook later.
    const MAX_ATTEMPTS = 3;
    const DELAY_MS = 2_000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await axios.patch(
          `${this.remnawareBaseUrl}/users`,
          { uuid, expireAt: expireAt.toISOString() },
          {
            headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
            timeout: 10_000,
          },
        );
        return; // success — stop retrying
      } catch (err: any) {
        if (attempt === MAX_ATTEMPTS) {
          this.logger.error(
            `updateUserExpiry failed for ${uuid} after ${MAX_ATTEMPTS} attempts: ${err.message}`,
          );
          throw err;
        }
        this.logger.warn(
          `updateUserExpiry attempt ${attempt}/${MAX_ATTEMPTS} failed for ${uuid}: ${err.message} — retrying in ${DELAY_MS}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }
  }

  private async triggerReferralReward(telegramId: number): Promise<boolean> {
    try {
      const { data } = await axios.post<{ rewarded: boolean }>(
        `${this.referralsBaseUrl}/reward-after-payment`,
        { invitedTelegramId: telegramId },
        {
          headers: {
            'x-service-secret': process.env.INTER_SERVICE_SECRET,
          },
        },
      );
      return data.rewarded;
    } catch (err: any) {
      this.logger.warn(`Referral reward failed for ${telegramId}: ${err.message}`);
      return false;
    }
  }
}
