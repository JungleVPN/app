import { PaymentPurpose } from '../common';
import type { Payments } from './payment';

/** Response from create-session endpoints (both providers) */
export interface PaymentSession {
  id: string;
  url: string;
}

/**
 * Body for POST /payments/yookassa/create-session.
 * Extends the native YooKassa request with our own fields stored server-side;
 * metadata is intentionally omitted — context is persisted in the DB record.
 */
export interface CreateYookassaSessionDto
  extends Omit<Payments.CreatePaymentRequest, 'metadata' | 'capture'> {
  userId: string;
  /** Telegram user id of the payer — stored on the DB record for admin lookups. */
  telegramId?: number | null;
  /** What this payment is for. Defaults to 'subscription'. */
  purpose?: PaymentPurpose;
  /** Optional promo code entered by the user; validated server-side. */
  promoCode?: string | null;
  /** Subscription status from remnawave, when known — used to validate the promo. */
  userStatus?: string;
  /** Subscription plan in months (1, 3, 6, 12). Defaults to the first allowed period. */
  selectedPeriod: number;
}
