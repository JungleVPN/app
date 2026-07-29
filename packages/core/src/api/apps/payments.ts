import {
  type AdminPaymentDto,
  apiRoutes,
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
    ): Promise<PaymentSession> {
      return client.post<PaymentSession>(apiRoutes.payments.yookassaCreateSession, dto);
    },

    async createStripeSession(dto: CreateStripeSessionDto): Promise<PaymentSession> {
      return client.post<PaymentSession>(apiRoutes.payments.stripeCreateSession, dto);
    },

    /** Subscription status + Billing Portal URL for the authenticated user. */
    async getStripeSubscription(): Promise<StripeSubscriptionStatusDto> {
      return client.get<StripeSubscriptionStatusDto>(apiRoutes.payments.stripeSubscription);
    },

    /** Active saved payment methods for the authenticated user. */
    async getSavedMethods(): Promise<SavedMethodDto[]> {
      return client.get<SavedMethodDto[]>(apiRoutes.payments.yookassaSavedMethods);
    },

    /** Delete a saved payment method belonging to the authenticated user. */
    async deleteSavedMethod(id: string): Promise<void> {
      return client.delete<void>(apiRoutes.payments.yookassaSavedMethodById(id));
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

    /** Payment history for the authenticated user across all providers. */
    async getMyTransactions(): Promise<AdminPaymentDto[]> {
      return client.get<AdminPaymentDto[]>(apiRoutes.payments.myTransactions);
    },

    /** Cross-user search — admin only. */
    async searchPayments(q: string): Promise<AdminPaymentDto[]> {
      return client.get<AdminPaymentDto[]>(apiRoutes.payments.searchPayments, { params: { q } });
    },
  };
}
