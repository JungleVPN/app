import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { createBackendClient } from '@utils/http-client';
import { generateReferralCode } from '@utils/url';
import { apiRoutes } from '@workspace/types';
import { AxiosInstance } from 'axios';

export interface ReferralRecord {
  id: string;
  inviterId: string;
  invitedId: string;
  status: 'TRIAL' | 'COMPLETED';
  createdAt: string;
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

  async getReferralRecord(invitedId: string): Promise<ReferralRecord | null> {
    try {
      const res = await this.backend.get(apiRoutes.referrals.byInvited(invitedId));

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

  async handleInviterRewardAfterPayment(invitedId: string): Promise<RewardAfterPaymentResult> {
    try {
      const res = await this.backend.post(apiRoutes.referrals.rewardAfterPayment, {
        invitedId,
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

  async deleteUser(invitedId: string): Promise<void> {
    try {
      const res = await this.backend.delete(apiRoutes.referrals.byInvited(invitedId));

      if (res.status >= 400) {
        this.logger.warn(`deleteUser failed: ${res.status}`);
      }
    } catch (e: any) {
      this.logger.error(`deleteUser error: ${e.message}`);
    }
  }

  getUserReferralLink(userId: string): string {
    const code = generateReferralCode(userId);
    return `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=ref_${code}`;
  }
}
