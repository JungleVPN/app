import {
  apiRoutes,
  type AdminPaymentDto,
  type CreateStripeSessionDto,
  type CreateTelegramStarsInvoiceDto,
  type CreateYookassaSessionDto,
  PaymentSession,
  SavedMethodDto,
  type StripeSubscriptionStatusDto,
  type TelegramStarsInvoiceResponse,
  type ValidatePromoDto,
  type ValidatePromoResponse,
} from '@workspace/types';
import type { ApiClient } from '../client';

export function createPaymentsApi(client: ApiClient) {
  return {
    async createYookassaSession(
      dto: Omit<CreateYookassaSessionDto, 'amount'>,
    ): Promise<PaymentSession> {  // selectedPeriod is derived server-side — callers don't set it
      return client.post<PaymentSession>(apiRoutes.payments.yookassaCreateSession, dto);
    },

    async createStripeSession(dto: CreateStripeSessionDto): Promise<PaymentSession> {
      return client.post<PaymentSession>(apiRoutes.payments.stripeCreateSession, dto);
    },

    async getStripeSubscription(userId: string): Promise<StripeSubscriptionStatusDto> {
      return client.get<StripeSubscriptionStatusDto>(apiRoutes.payments.stripeSubscription(userId));
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

    async validatePromo(dto: ValidatePromoDto): Promise<ValidatePromoResponse> {
      return client.post<ValidatePromoResponse>(apiRoutes.payments.promoValidate, dto);
    },

    async searchPayments(q: string): Promise<AdminPaymentDto[]> {
      return client.get<AdminPaymentDto[]>(apiRoutes.payments.searchPayments, { params: { q } });
    },
  };
}
