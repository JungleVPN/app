import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { AdminPaymentDto, apiRoutes } from '@workspace/types';
import axios from 'axios';

/**
 * HTTP client for the payments service's unified search endpoint.
 * Used to verify an inviter has an actual settled payment (not just a
 * trial), since remnawave reports both TRIAL and paid subscriptions as
 * status "ACTIVE".
 */
@Injectable()
export class PaymentsClient {
  private readonly logger = new Logger(PaymentsClient.name);

  private get baseUrl(): string {
    return process.env.PUBLIC_PAYMENTS_URL || 'http://localhost:3001/payments';
  }

  /**
   * Whether `userId` has at least one settled *subscription* payment (paidAt set)
   * within the last `days` days. Extra-device add-on purchases don't count — a
   * trial user can buy one without ever paying for a base subscription.
   */
  async hasPaidWithinDays(userId: string, days: number): Promise<boolean> {
    try {
      const { data } = await axios.get<AdminPaymentDto[]>(
        `${this.baseUrl}${apiRoutes.payments.searchPayments}`,
        { params: { q: userId } },
      );

      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return data.some(
        (payment) =>
          payment.purpose === 'subscription' &&
          payment.paidAt &&
          new Date(payment.paidAt).getTime() >= cutoff,
      );
    } catch (err: any) {
      this.logger.error(`hasPaidWithinDays failed for ${userId}: ${err.message}`);
      return false;
    }
  }
}
