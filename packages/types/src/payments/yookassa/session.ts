import type { RemnaUserId } from '../../remnawave';
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
 * `amount` is optional because the server prices the payment from
 * `selectedPeriod` and ignores anything the caller sends.
 */
export interface CreateYookassaSessionDto
  extends Omit<Payments.CreatePaymentRequest, 'capture' | 'amount'> {
  amount?: Payments.CreatePaymentRequest['amount'];
  userId: RemnaUserId | null;
  /** Payer's email. The account is found-or-created from it server-side. */
  email: string;
  /** Referring user id captured from a `?ref=` link, when present. */
  inviterId?: number;
  /** Telegram user id of the payer — stored on the DB record for admin lookups. */
  telegramId?: number | null;
  /** What this payment is for. Defaults to 'subscription'. */
  purpose?: PaymentPurpose;
  /** Optional promo code entered by the user; validated server-side. */
  promoCode?: string | null;
  /** Subscription status from remnawave, when known — used to validate the promo. */
  userStatus?: string;
  /** Subscription plan in days. Defaults to the first allowed period. */
  selectedPeriod: number;
}

/**
 * Body for POST /payments/yookassa/public-create-session — the anonymous RU
 * checkout. The payer has no credential, so the account is resolved from the
 * email server-side and everything else the authenticated route accepts
 * (userId, telegramId, promo, saved-method opt-out) is deliberately absent.
 */
export interface CreatePublicYookassaSessionDto {
  /** Payer's email. The account is found-or-created from it server-side. */
  email: string;
  /** Subscription plan in months (1, 3, 6, 12). */
  selectedPeriod: number;
  /** Where YooKassa returns the payer once they are done paying. */
  returnUrl: string;
  /** Tolt affiliate referral id (`window.tolt_referral`), when present. */
  toltReferralId?: string | null;
  /** Referring user id captured from a `?ref=` link, when present. */
  inviterId?: number;
}
