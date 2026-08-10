import { PaymentPurpose } from '../common';

/** Request body for POST /telegram-stars/create-invoice (TMA → payments service) */
export interface CreateTelegramStarsInvoiceDto {
  userId: string;
  telegramId?: number | null;
  selectedPeriod: number;
  /** Number of Telegram Stars to charge */
  starsAmount: number;
  /** Human-readable title shown in the Telegram invoice */
  title: string;
  /** Human-readable description shown in the Telegram invoice */
  description: string;
  /** What this payment is for. Defaults to 'subscription'. */
  purpose?: PaymentPurpose;
  /** Optional promo code entered by the user; validated server-side. */
  promoCode?: string | null;
  /** Subscription status from remnawave, when known — used to validate the promo. */
  userStatus?: string;
}

/** Response from POST /telegram-stars/create-invoice */
export interface TelegramStarsInvoiceResponse {
  invoiceLink: string;
}

/**
 * Request body for POST /telegram-stars/payment-succeeded.
 * Called internally by apps/bot after receiving message:successful_payment.
 * Guarded by x-service-secret header.
 */
export interface TelegramStarsPaymentSucceededDto {
  /** The pending payment record id created at invoice generation time */
  paymentRecordId: string;
  /** Telegram's own charge id — stored for potential refunds */
  telegramPaymentChargeId: string;
}
