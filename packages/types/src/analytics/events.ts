import { PaymentMethod, PaymentPurpose, PromoErrorCode } from '../payments';
import type { RemnaUserId } from '../remnawave';

export type BotStartedEvent = {
  event: 'bot_started';
  email: string | null;
  telegramId: number;
  adCode: string | null | undefined;
  isReturningUser: boolean;
};

export type TmaOpenedEvent = {
  event: 'tma_opened';
  telegramId: number;
  userId: RemnaUserId | null;
  email: string | null;
};

export type UserCreatedEvent = {
  event: 'user_created';
  userId: RemnaUserId;
  telegramId: number;
  email: string | null;
};

export type CheckoutStartedEvent = {
  event: 'checkout_started';
  userId: RemnaUserId;
  provider: PaymentMethod;
  purpose: PaymentPurpose;
  amount: string;
  currency: string;
};

export type PaymentSucceededEvent = {
  event: 'payment_succeeded';
  userId: RemnaUserId;
  provider: PaymentMethod;
  /** Omitted when the settling row could not be matched back to a session (should not normally happen). */
  purpose?: PaymentPurpose;
  selectedPeriod: number;
  isFirstPayment: boolean;
  isAutoPayment: boolean;
  /** Omitted when the provider settlement carries no reliable amount (e.g. a Stripe invoice with no resolvable total). */
  amount?: string;
  currency?: string;
};

/** Fired when a charge (subscription or extra device) is refunded, in full or in part. */
export type PaymentRefundedEvent = {
  event: 'payment_refunded';
  userId: RemnaUserId;
  provider: PaymentMethod;
  isPartial: boolean;
  amount?: string;
  currency?: string;
};

export type PaymentFailedEvent = {
  event: 'payment_failed';
  userId: RemnaUserId;
  provider: 'yookassa' | 'stripe';
  paymentId: string;
  reason: string;
};

export type PaymentMethodSavedEvent = {
  event: 'payment_method_saved';
  userId: RemnaUserId;
  provider: 'yookassa' | 'stripe';
  paymentId: string;
  methodType: string;
};

export type AutopaymentInitiatedEvent = {
  event: 'autopayment_initiated';
  userId: RemnaUserId;
  provider: 'yookassa' | 'stripe';
};

export type AutopaymentFailedEvent = {
  event: 'autopayment_failed';
  userId: RemnaUserId;
  provider: 'yookassa' | 'stripe';
  reason: string;
};

export type PromoCodeAppliedEvent = {
  event: 'promo_code_applied';
  userId: RemnaUserId;
  code: string;
  provider: PaymentMethod;
};

export type ReferralRewardGrantedEvent = {
  event: 'referral_reward_granted';
  invitedUserId: RemnaUserId;
  inviterUserId: RemnaUserId;
};

/** Fired once a new user's inviterId is recorded — before any reward is granted. */
export type ReferralLinkedEvent = {
  event: 'referral_linked';
  invitedUserId: RemnaUserId;
  inviterUserId: RemnaUserId;
};

/** Fired when a promo code fails checkout-time validation (not a fulfillment-time rejection). */
export type PromoCodeRejectedEvent = {
  event: 'promo_code_rejected';
  userId: RemnaUserId;
  code: string;
  reason: PromoErrorCode;
};

export type ExpiryReminderSentEvent = {
  event: 'expiry_reminder_sent';
  userId: RemnaUserId;
  hoursRemaining: 48 | 24;
};

export type SubscriptionExpiredEvent = {
  event: 'subscription_expired';
  userId: RemnaUserId;
};

/** Fired the first time a user's device actually connects to a node (Remnawave `user.first_connected`). */
export type UserFirstConnectedEvent = {
  event: 'user_first_connected';
  userId: RemnaUserId;
};

export type AnalyticsEvent =
  | BotStartedEvent
  | TmaOpenedEvent
  | UserCreatedEvent
  | CheckoutStartedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent
  | PaymentMethodSavedEvent
  | AutopaymentInitiatedEvent
  | AutopaymentFailedEvent
  | PromoCodeAppliedEvent
  | PromoCodeRejectedEvent
  | ReferralLinkedEvent
  | ReferralRewardGrantedEvent
  | ExpiryReminderSentEvent
  | SubscriptionExpiredEvent
  | UserFirstConnectedEvent;
