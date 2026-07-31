import { PaymentMethod } from '../payments';

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
  userId: string | null;
  email: string | null;
};

export type UserCreatedEvent = {
  event: 'user_created';
  userId: string;
  telegramId: number;
  email: string | null;
};

export type CheckoutStartedEvent = {
  event: 'checkout_started';
  userId: string;
  provider: PaymentMethod;
  amount: string;
  currency: string;
};

export type PaymentSucceededEvent = {
  event: 'payment_succeeded';
  userId: string;
  provider: PaymentMethod;
  selectedPeriod: number;
  isFirstPayment: boolean;
  isAutoPayment: boolean;
};

export type PaymentFailedEvent = {
  event: 'payment_failed';
  userId: string;
  provider: 'yookassa' | 'stripe';
  paymentId: string;
  reason: string;
};

export type PaymentMethodSavedEvent = {
  event: 'payment_method_saved';
  userId: string;
  provider: 'yookassa' | 'stripe';
  paymentId: string;
  methodType: string;
};

export type AutopaymentInitiatedEvent = {
  event: 'autopayment_initiated';
  userId: string;
  provider: 'yookassa' | 'stripe';
};

export type AutopaymentFailedEvent = {
  event: 'autopayment_failed';
  userId: string;
  provider: 'yookassa' | 'stripe';
  reason: string;
};

export type PromoCodeAppliedEvent = {
  event: 'promo_code_applied';
  userId: string;
  code: string;
  provider: PaymentMethod;
};

export type ReferralRewardGrantedEvent = {
  event: 'referral_reward_granted';
  invitedUserId: string;
  inviterUserId: string;
};

export type ExpiryReminderSentEvent = {
  event: 'expiry_reminder_sent';
  userId: string;
  hoursRemaining: 48 | 24;
};

export type SubscriptionExpiredEvent = {
  event: 'subscription_expired';
  userId: string;
};

export type AnalyticsEvent =
  | BotStartedEvent
  | TmaOpenedEvent
  | UserCreatedEvent
  | CheckoutStartedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentMethodSavedEvent
  | AutopaymentInitiatedEvent
  | AutopaymentFailedEvent
  | PromoCodeAppliedEvent
  | ReferralRewardGrantedEvent
  | ExpiryReminderSentEvent
  | SubscriptionExpiredEvent;
