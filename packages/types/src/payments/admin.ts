import type { RemnaUserId } from '../remnawave';
import { PaymentPurpose } from './common';

/** Payment provider identifier */
export type AdminPaymentProvider = 'yookassa' | 'telegram_stars' | 'stripe';

/** Unified payment record returned by the admin search endpoint */
export interface AdminPaymentDto {
  /** Internal payment record id */
  paymentId: string;
  provider: AdminPaymentProvider;
  userId: RemnaUserId;
  telegramId?: number | null;
  status: string;
  purpose: PaymentPurpose;
  /** Fiat amount (YooKassa only) */
  amount?: string;
  /** Stars amount (Telegram Stars only) */
  starsAmount?: number;
  currency?: string;
  selectedPeriod: number;
  createdAt: Date;
  paidAt: Date | null;
}

/** Query params for GET /admin/payments/search */
export interface AdminSearchPaymentsQuery {
  /** Value to search — matched against paymentId, userId and telegramId */
  q: string;
}
