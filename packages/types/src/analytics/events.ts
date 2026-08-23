import { PaymentMethod } from '../payments';
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
  amount: string;
  currency: string;
};

export type PaymentSucceededEvent = {
  event: 'payment_succeeded';
  userId: RemnaUserId;
  provider: PaymentMethod;
  selectedPeriod: number;
  isFirstPayment: boolean;
  isAutoPayment: boolean;
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

export type ExpiryReminderSentEvent = {
  event: 'expiry_reminder_sent';
  userId: RemnaUserId;
  hoursRemaining: 48 | 24;
};

export type SubscriptionExpiredEvent = {
  event: 'subscription_expired';
  userId: RemnaUserId;
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
