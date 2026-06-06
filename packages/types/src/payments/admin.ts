/** Payment provider identifier */
export type AdminPaymentProvider = 'yookassa' | 'telegram_stars';

/** Unified payment record returned by the admin search endpoint */
export interface AdminPaymentDto {
  /** Internal payment record id */
  paymentId: string;
  provider: AdminPaymentProvider;
  userId: string;
  telegramId?: number | null;
  status: string;
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
