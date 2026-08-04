import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { apiRoutes } from '@workspace/types';
import axios from 'axios';

/**
 * HTTP client for the payments service's internal has-ever-paid endpoint.
 * Used to verify an inviter has an actual settled payment (not just a
 * trial), since remnawave reports both TRIAL and paid subscriptions as
 * status "ACTIVE".
 */
@Injectable()
export class PaymentsClient {
  private readonly logger = new Logger(PaymentsClient.name);

  private get baseUrl(): string {
    return process.env.PAYMENTS_INTERNAL_URL || process.env.PUBLIC_PAYMENTS_URL || 'http://localhost:3001/payments';
  }

  /**
   * Whether `userId` has at least one settled *subscription* payment on record.
   * Extra-device add-on purchases don't count — a trial user can buy one
   * without ever paying for a base subscription.
   */
  async hasEverPaid(userId: string): Promise<boolean> {
    try {
      const { data } = await axios.get<{ result: boolean }>(
        `${this.baseUrl}${apiRoutes.payments.hasEverPaid}`,
        {
          params: { userId },
          headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
        },
      );
      return data.result;
    } catch (err: any) {
      this.logger.error(`hasEverPaid failed for ${userId}: ${err.message}`);
      return false;
    }
  }
}
