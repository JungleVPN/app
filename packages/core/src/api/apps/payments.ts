import {
  apiRoutes,
  type AdminPaymentDto,
  type CreateTelegramStarsInvoiceDto,
  type CreateYookassaSessionDto,
  PaymentSession,
  SavedMethodDto,
  type TelegramStarsInvoiceResponse,
} from '@workspace/types';
import type { ApiClient } from '../client';

export function createPaymentsApi(client: ApiClient) {
  return {
    async createYookassaSession(
      dto: Omit<CreateYookassaSessionDto, 'amount' | 'selectedPeriod'>,
    ): Promise<PaymentSession> {
      return client.post<PaymentSession>(apiRoutes.payments.yookassaCreateSession, dto);
    },

    async getSavedMethods(userId: string): Promise<SavedMethodDto[]> {
      return client.get<SavedMethodDto[]>(apiRoutes.payments.yookassaSavedMethods(userId));
    },

    async deleteSavedMethod(userId: string, id: string): Promise<void> {
      return client.delete<void>(apiRoutes.payments.yookassaSavedMethodById(userId, id));
    },

    async createTelegramStarsInvoice(
      dto: Omit<CreateTelegramStarsInvoiceDto, 'starsAmount' | 'selectedPeriod'>,
    ): Promise<TelegramStarsInvoiceResponse> {
      return client.post<TelegramStarsInvoiceResponse>(
        apiRoutes.payments.telegramStarsCreateInvoice,
        dto,
      );
    },

    /**
     * Admin: search payments by paymentId, userId or telegramId across all providers.
     * Requires X-Admin-Telegram-Id header to be accepted by the backend.
     */
    async searchPayments(q: string, adminTelegramId: string): Promise<AdminPaymentDto[]> {
      return client.get<AdminPaymentDto[]>(apiRoutes.payments.adminSearchPayments, {
        params: { q },
        headers: { 'X-Admin-Telegram-Id': adminTelegramId },
      });
    },
  };
}
