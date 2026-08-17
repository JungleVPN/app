import {
  type AdminPaymentDto,
  apiRoutes,
  type CaptureToltReferralDto,
  type CreateStripeSessionDto,
  type CreateTelegramStarsInvoiceDto,
  type CreateYookassaSessionDto,
  PaymentSession,
  type RecordToltClickDto,
  type RecordToltClickResponse,
  SavedMethodDto,
  type StripeSubscriptionStatusDto,
  type SubscriptionPlanDto,
  type TelegramStarsInvoiceResponse,
  type ValidatePromoDto,
  type ValidatePromoResponse,
} from '@workspace/types';
import type { ApiClient } from '../client';

export function createPaymentsApi(client: ApiClient) {
  return {
    async getSubscriptionPlans(): Promise<SubscriptionPlanDto[]> {
      return client.get<SubscriptionPlanDto[]>(apiRoutes.payments.plans);
    },

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
      dto: Omit<CreateTelegramStarsInvoiceDto, 'starsAmount'>,
    ): Promise<TelegramStarsInvoiceResponse> {
      return client.post<TelegramStarsInvoiceResponse>(
        apiRoutes.payments.telegramStarsCreateInvoice,
        dto,
      );
    },

    async validatePromo(dto: ValidatePromoDto): Promise<ValidatePromoResponse> {
      return client.post<ValidatePromoResponse>(apiRoutes.payments.promoValidate, dto);
    },

    /**
     * Persist the browser's affiliate attribution against the authenticated
     * user, so it survives past the session that produced it.
     */
    async captureToltReferral(dto: CaptureToltReferralDto): Promise<{ ok: true }> {
      return client.post<{ ok: true }>(apiRoutes.payments.toltReferral, dto);
    },

    /**
     * Record an affiliate click and resolve its partner. Unauthenticated — the
     * visitor has no account yet.
     */
    async recordToltClick(dto: RecordToltClickDto): Promise<RecordToltClickResponse> {
      return client.post<RecordToltClickResponse>(apiRoutes.payments.toltClick, dto);
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
