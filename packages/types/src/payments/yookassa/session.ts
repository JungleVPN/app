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
  selectedPeriod: number;
  /** Telegram user id of the payer — stored on the DB record for admin lookups. */
  telegramId?: number | null;
}
