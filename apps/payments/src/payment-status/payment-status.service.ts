import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { PromoService } from '@payments/promo/promo.service';
import type { PaymentPurpose, PromoProvider } from '@workspace/types';
import axios from 'axios';

/**
 * Orchestrates post-payment business logic via HTTP calls to other services.
 *
 * Lives in the payments app because payment events originate here.
 * Calls remnawave to extend user subscription, and referrals to trigger rewards.
 */
@Injectable()
export class PaymentStatusService {
  private readonly logger = new Logger(PaymentStatusService.name);

  constructor(private readonly promoService: PromoService) {}

  private get remnawareBaseUrl(): string {
    return process.env.PUBLIC_REMNAWAVE_URL || 'http://localhost:3002';
  }

  private get referralsBaseUrl(): string {
    return process.env.REFERRALS_URL || 'http://localhost:3004';
  }

  /**
   * Called after a successful payment (Stripe, Yookassa, or Stars).
   * Dispatches to subscription extension or extra-device bump based on purpose.
   */
  async handleUserUpdates({
    selectedPeriod,
    userId,
    purpose = 'subscription',
    promo,
  }: {
    selectedPeriod: number;
    userId: string;
    purpose?: PaymentPurpose;
    /** Set for subscription payments that may carry a promo code. */
    promo?: { code: string | null; provider: PromoProvider; paymentId: string };
  }): Promise<{ success: boolean }> {
    // Promo codes only extend subscriptions — never device slots.
    const months =
      purpose === 'extra_device' || !promo
        ? selectedPeriod
        : await this.promoService.applyToMonths(promo.code, selectedPeriod, {
            userId,
            provider: promo.provider,
            paymentId: promo.paymentId,
          });

    const user =
      purpose === 'extra_device'
        ? await this.addExtraDevice(userId)
        : await this.extendUserExpiry(userId, months);

    if (!user) {
      this.logger.warn(`User not found: userId=${userId}`);
      return { success: false };
    }

    if (user.telegramId) {
      await this.triggerReferralReward(user.telegramId);
    }

    this.logger.log(
      purpose === 'extra_device'
        ? `Payment processed for user ${userId}: +1 device slot`
        : `Payment processed for user ${userId}: +${months} month(s)`,
    );

    return { success: true };
  }

  private async addExtraDevice(
    uuid: string,
  ): Promise<{ telegramId: number | null } | null> {
    try {
      const { data } = await axios.patch<{ telegramId: number | null }>(
        `${this.remnawareBaseUrl}/users/${uuid}/extra-device`,
        {},
        {
          headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
          timeout: 10_000,
        },
      );
      return data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.error(`addExtraDevice failed for ${uuid}: ${err.message}`);
      throw err;
    }
  }

  // Retry up to 3 times with a 2-second gap between attempts.
  // A transient remnawave blip must not silently swallow a successful payment —
  // if all attempts fail the error is intentionally rethrown so the caller can
  // propagate a non-200 back to YooKassa and let it retry the webhook later.
  private async extendUserExpiry(
    uuid: string,
    months: number,
  ): Promise<{ telegramId: number | null } | null> {
    const MAX_ATTEMPTS = 3;
    const DELAY_MS = 2_000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const { data } = await axios.patch<{ telegramId: number | null }>(
          `${this.remnawareBaseUrl}/users/${uuid}/expiry`,
          { months },
          {
            headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
            timeout: 10_000,
          },
        );
        return data;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        if (attempt === MAX_ATTEMPTS) {
          this.logger.error(
            `extendUserExpiry failed for ${uuid} after ${MAX_ATTEMPTS} attempts: ${err.message}`,
          );
          throw err;
        }
        this.logger.warn(
          `extendUserExpiry attempt ${attempt}/${MAX_ATTEMPTS} failed for ${uuid}: ${err.message} — retrying in ${DELAY_MS}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    return null;
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
