import {
  type AdminPaymentDto,
  apiRoutes,
  type CaptureToltReferralDto,
  type CheckWhopPromoCodeDto,
  type CreatePublicPaddleCheckoutDto,
  type CreatePublicStripeSessionDto,
  type CreatePublicWhopCheckoutDto,
  type CreatePublicYookassaSessionDto,
  type CreateStripeSessionDto,
  type CreateTelegramStarsInvoiceDto,
  type CreateYookassaSessionDto,
  type PaddleCheckoutPayload,
  PaymentSession,
  type Payments,
  type PayPublicWhopCheckoutDto,
  type ProviderPortalDto,
  type ProviderSubscriptionDto,
  type RecordToltClickDto,
  type RecordToltClickResponse,
  SavedMethodDto,
  type TelegramStarsInvoiceResponse,
  type ValidatePromoDto,
  type ValidatePromoResponse,
  type WhopCancelDto,
  type WhopResumeDto,
  type WhopCheckoutPayload,
  type WhopPaymentDto,
  type WhopPaymentStatusDto,
  type WhopPromoCodeDto,
} from '@workspace/types';
import type { ApiClient } from '../client';

export function createPaymentsApi(client: ApiClient) {
  return {
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

    /**
     * Validates an anonymous Whop checkout and returns the account and Whop
     * plan the card form mounts against. Nothing is charged yet.
     */
    async createPublicWhopCheckout(dto: CreatePublicWhopCheckoutDto): Promise<WhopCheckoutPayload> {
      return client.post<WhopCheckoutPayload>(apiRoutes.payments.whopPublicCreateCheckout, dto);
    },

    /**
     * Charges the card Whop's fields tokenised. The returned payment may still
     * need a buyer step (3DS), finished in the browser with its client secret.
     */
    async payPublicWhopCheckout(dto: PayPublicWhopCheckoutDto): Promise<WhopPaymentDto> {
      return client.post<WhopPaymentDto>(apiRoutes.payments.whopPublicPay, dto);
    },

    /** Whether our webhook has fulfilled a Whop payment — the checkout waits on this. */
    async getPublicWhopPaymentStatus(id: string): Promise<WhopPaymentStatusDto> {
      return client.get<WhopPaymentStatusDto>(apiRoutes.payments.whopPublicPaymentStatus(id));
    },

    /** The discount a promo code gives the chosen plan; a 400 when it gives none. */
    async checkPublicWhopPromoCode(dto: CheckWhopPromoCodeDto): Promise<WhopPromoCodeDto> {
      return client.post<WhopPromoCodeDto>(apiRoutes.payments.whopPublicPromoCode, dto);
    },

    /**
     * Whether the user is subscribed through Stripe, read from our own records
     * rather than Stripe's API — cheap enough to ask on every profile load.
     */
    async getStripeSubscription(): Promise<ProviderSubscriptionDto> {
      return client.get<ProviderSubscriptionDto>(apiRoutes.payments.stripeSubscription);
    },

    /** The same question for Paddle, answered the same way. */
    async getPaddleSubscription(): Promise<ProviderSubscriptionDto> {
      return client.get<ProviderSubscriptionDto>(apiRoutes.payments.paddleSubscription);
    },

    /** The same question for Whop, answered the same way. */
    async getWhopSubscription(): Promise<ProviderSubscriptionDto> {
      return client.get<ProviderSubscriptionDto>(apiRoutes.payments.whopSubscription);
    },

    /**
     * Cancels the user's Whop subscription at period end. Whop has no customer
     * portal to send them to, so this is its stand-in for the portal URL.
     */
    async cancelWhopSubscription(): Promise<WhopCancelDto> {
      return client.post<WhopCancelDto>(apiRoutes.payments.whopCancel, {});
    },

    /** Reverses the user's pending Whop cancellation, so it renews again. */
    async resumeWhopSubscription(): Promise<WhopResumeDto> {
      return client.post<WhopResumeDto>(apiRoutes.payments.whopResume, {});
    },

    /**
     * A fresh Stripe Billing Portal URL. Minted on demand because portal
     * sessions expire — ask only when the user presses "manage".
     */
    async getStripePortalUrl(): Promise<ProviderPortalDto> {
      return client.get<ProviderPortalDto>(apiRoutes.payments.stripePortal);
    },

    /** The same, for Paddle's Customer Portal. */
    async getPaddlePortalUrl(): Promise<ProviderPortalDto> {
      return client.get<ProviderPortalDto>(apiRoutes.payments.paddlePortal);
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

    /**
     * Active saved YooKassa payment methods for the authenticated user.
     *
     * YooKassa only: the endpoint filters on `provider: 'yookassa'`, so a Stripe
     * or Paddle subscriber answers `[]` here. Their billing is reported by
     * `getStripeSubscription` / `getPaddleSubscription` instead.
     */
    async getYookassaSavedMethods(): Promise<SavedMethodDto[]> {
      return client.get<SavedMethodDto[]>(apiRoutes.payments.yookassaSavedMethods);
    },

    /** Delete a saved YooKassa payment method belonging to the authenticated user. */
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
