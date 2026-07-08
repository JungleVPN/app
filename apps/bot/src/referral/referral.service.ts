import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { createBackendClient } from '@utils/http-client';
import { apiRoutes } from '@workspace/types';
import { AxiosInstance } from 'axios';
import { generateReferralCode } from './referral.utils';

export interface ReferralRecord {
  id: string;
  inviterId: number;
  invitedId: number;
  status: 'FIRST_REWARD' | 'COMPLETED';
  createdAt: string;
}

export interface HandleNewUserResult {
  success: boolean;
  reason?: string;
}

export interface RewardAfterPaymentResult {
  rewarded: boolean;
  reason?: string;
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  private backend: AxiosInstance = createBackendClient(
    process.env.PUBLIC_REFERRALS_URL || 'http://localhost:3004/referrals',
  );

  async handleNewUser(
    inviterId: number,
    invitedTelegramId: number,
    locale?: string,
  ): Promise<HandleNewUserResult> {
    try {
      const res = await this.backend.post(apiRoutes.referrals.collection, {
        inviterId,
        invitedTelegramId,
        locale,
      });

      if (res.status >= 400) {
        this.logger.warn(`handleNewUser failed: ${res.status} ${JSON.stringify(res.data)}`);
        return { success: false, reason: res.data?.message || 'unknown_error' };
      }

      return res.data;
    } catch (e: any) {
      this.logger.error(`handleNewUser error: ${e.message}`);
      return { success: false, reason: 'request_failed' };
    }
  }

  async getReferralRecord(invitedTelegramId: number): Promise<ReferralRecord | null> {
    try {
      const res = await this.backend.get(apiRoutes.referrals.byInvited(invitedTelegramId));

      if (res.status === 404) return null;

      if (res.status >= 400) {
        this.logger.warn(`getReferralRecord failed: ${res.status}`);
        return null;
      }

      return res.data;
    } catch (e: any) {
      this.logger.error(`getReferralRecord error: ${e.message}`);
      return null;
    }
  }

  async handleInviterRewardAfterPayment(
    invitedTelegramId: number,
  ): Promise<RewardAfterPaymentResult> {
    try {
      const res = await this.backend.post(apiRoutes.referrals.rewardAfterPayment, {
        invitedTelegramId,
      });

      if (res.status >= 400) {
        this.logger.warn(`rewardAfterPayment failed: ${res.status} ${JSON.stringify(res.data)}`);
        return { rewarded: false, reason: res.data?.message || 'unknown_error' };
      }

      return res.data;
    } catch (e: any) {
      this.logger.error(`rewardAfterPayment error: ${e.message}`);
      return { rewarded: false, reason: 'request_failed' };
    }
  }

  async deleteUser(invitedTelegramId: number): Promise<void> {
    try {
      const res = await this.backend.delete(apiRoutes.referrals.byInvited(invitedTelegramId));

      if (res.status >= 400) {
        this.logger.warn(`deleteUser failed: ${res.status}`);
      }
    } catch (e: any) {
      this.logger.error(`deleteUser error: ${e.message}`);
    }
  }

  getUserReferralLink(telegramId: number): string {
    const code = generateReferralCode(telegramId);
    return `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=ref_${code}`;
  }
}
