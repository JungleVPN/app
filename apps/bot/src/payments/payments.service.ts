import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { CreateStripeSessionDto } from '@shared/payments';
import { createBackendClient } from '@utils/http-client';
import {
  apiRoutes,
  CreateYookassaSessionDto,
  SavedMethodDto,
  TelegramStarsPaymentSucceededDto,
} from '@workspace/types';
import { AxiosInstance, AxiosResponse } from 'axios';

/**
 * HTTP client for the payments backend service (port 3001).
 * Each provider has its own endpoint matching the BE controller contract.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  private backend: AxiosInstance = createBackendClient(
    process.env.PUBLIC_PAYMENTS_URL || 'http://localhost:3001/payments',
  );

  async createStripeSession(dto: CreateStripeSessionDto) {
    const res = await this.backend.post(apiRoutes.payments.stripeCreateSession, dto);

    if (res.status >= 400) {
      this.logger.error(`Stripe session failed: ${res.status} ${JSON.stringify(res.data)}`);
      throw new Error(`Stripe payment creation failed: ${res.status}`);
    }

    return res.data;
  }

  async createYookassaSession(dto: CreateYookassaSessionDto) {
    const res = await this.backend.post(apiRoutes.payments.yookassaCreateSession, dto);

    if (res.status >= 400) {
      this.logger.error(`Yookassa session failed: ${res.status} ${JSON.stringify(res.data)}`);
      throw new Error(`Yookassa payment creation failed: ${res.status}`);
    }

    return res.data;
  }

  /**
   * Hard-deletes a saved payment method (YooKassa). The backend requires both
   * `telegramId` and the method's primary id so one user can't delete another
   * user's record.
   *
   * Returns `true` on success and `false` for any non-2xx response or network
   * error — callers decide whether to show an error toast or just re-render.
   */
  async deleteSavedMethod(id: string): Promise<AxiosResponse<void>> {
    return this.backend.delete<void>(apiRoutes.payments.yookassaSavedMethodById(id));
  }

  /**
   * Fetches active saved payment methods for a user (YooKassa only today —
   * Stripe has no equivalent concept of "saved methods" on the backend yet).
   *
   * Returns an empty array on any error so callers can treat "no method"
   * identically to "BE unreachable" — the profile screen shouldn't fail just
   * because we couldn't enrich it with autopayment info.
   */
  async getSavedMethods(): Promise<AxiosResponse<SavedMethodDto[]>> {
    return this.backend.get<SavedMethodDto[]>(apiRoutes.payments.yookassaSavedMethods);
  }

  /**
   * Notifies apps/payments that a Telegram Stars payment succeeded.
   * Called by TelegramStarsListener after receiving message:successful_payment.
   * The payments service marks the DB record as succeeded and extends the subscription.
   */
  async handleTelegramStarsPaymentSucceeded(dto: TelegramStarsPaymentSucceededDto): Promise<void> {
    try {
      const res = await this.backend.post(apiRoutes.payments.telegramStarsPaymentSucceeded, dto, {
        headers: {
          'x-service-secret': process.env.INTER_SERVICE_SECRET || '',
        },
      });

      if (res.status >= 400) {
        this.logger.error(
          `Stars payment-succeeded call failed: ${res.status} ${JSON.stringify(res.data)}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`handleTelegramStarsPaymentSucceeded failed: ${err.message}`);
    }
  }
}
