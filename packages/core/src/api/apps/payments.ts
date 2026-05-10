import {
  apiRoutes,
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
  };
}
