import {
  type AdminPaymentDto,
  apiRoutes,
  type CaptureToltReferralDto,
  type CreatePublicPaddleCheckoutDto,
  type CreatePublicStripeSessionDto,
  type CreatePublicYookassaSessionDto,
  type CreateStripeSessionDto,
  type CreateTelegramStarsInvoiceDto,
  type CreateYookassaSessionDto,
  type PaddleCheckoutPayload,
  type PaddleSubscriptionStatusDto,
  PaymentSession,
  type Payments,
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

    /**
     * Anonymous RU checkout for the standalone payment page — the backend
     * find-or-creates the account from the payer email and answers with the
     * YooKassa confirmation URL to send the payer to.
     */
    async createPublicYookassaSession(
      dto: CreatePublicYookassaSessionDto,
    ): Promise<PaymentSession> {
      return client.post<PaymentSession>(apiRoutes.payments.yookassaPublicCreateSession, dto);
    },

    async createStripeSession(dto: CreateStripeSessionDto): Promise<PaymentSession> {
      return client.post<PaymentSession>(apiRoutes.payments.stripeCreateSession, dto);
    },

    /**
     * Anonymous checkout for the standalone payment page — the backend
     * find-or-creates the account from the payer email, so no session is needed.
     */
    async createPublicStripeSession(dto: CreatePublicStripeSessionDto): Promise<PaymentSession> {
      return client.post<PaymentSession>(apiRoutes.payments.stripePublicCreateSession, dto);
    },

    /**
     * Validates an anonymous Paddle checkout and returns what the caller needs
     * to open `Paddle.Checkout.open()` itself — Paddle Checkout is opened
     * client-side, unlike Stripe's server-created hosted session.
     */
    async createPublicPaddleCheckout(
      dto: CreatePublicPaddleCheckoutDto,
    ): Promise<PaddleCheckoutPayload> {
      return client.post<PaddleCheckoutPayload>(apiRoutes.payments.paddlePublicCreateCheckout, dto);
    },

    /** Subscription status + Billing Portal URL for the authenticated user. */
    async getStripeSubscription(): Promise<StripeSubscriptionStatusDto> {
      return client.get<StripeSubscriptionStatusDto>(apiRoutes.payments.stripeSubscription);
    },

    /** Subscription status + Customer Portal URL for the authenticated user. */
    async getPaddleSubscription(): Promise<PaddleSubscriptionStatusDto> {
      return client.get<PaddleSubscriptionStatusDto>(apiRoutes.payments.paddleSubscription);
    },

    /**
     * Status of one of the user's own YooKassa payments — the return page's
     * only way to tell a completed payment from a cancelled one.
     */
    async getYookassaPaymentStatus(
      id: string,
    ): Promise<{ id: string; status: Payments.PaymentStatus }> {
      return client.get<{ id: string; status: Payments.PaymentStatus }>(
        apiRoutes.payments.yookassaPaymentStatus(id),
      );
    },

    /**
     * The same status by payment id alone. The RU checkout is anonymous, so the
     * payer coming back from YooKassa has no credential to look it up with.
     */
    async getPublicYookassaPaymentStatus(
      id: string,
    ): Promise<{ id: string; status: Payments.PaymentStatus }> {
      return client.get<{ id: string; status: Payments.PaymentStatus }>(
        apiRoutes.payments.yookassaPublicPaymentStatus(id),
      );
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
