import type { RemnaUserId } from '../../remnawave';
/**
 * DTO returned by GET /api/payments/yookassa/saved-methods/:userId.
 * Shape mirrors the SavedPaymentMethod TypeORM entity.
 */
export interface SavedMethodDto {
  id: string;
  userId: RemnaUserId;
  provider: string;
  /** YooKassa payment_method.id used for recurring charges */
  paymentMethodId: string;
  /** e.g. 'bank_card', 'yoo_money', 'sbp', 'sberbank', 'tinkoff_bank' */
  paymentMethodType: string;
  /** Human-readable label, e.g. "Visa **** 4242" */
  title: string | null;
  /** Present when paymentMethodType === 'bank_card' */
  card: {
    last4?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cardType?: string;
    first6?: string;
    issuerCountry?: string;
  } | null;
  isActive: boolean;
  /** What the subscription is for, e.g. "Jungle VPN". Whop only; null elsewhere. */
  productName: string | null;
  /** Last amount charged, in major units of `currency`. Whop only; null elsewhere. */
  amount: number | null;
  /** Uppercase ISO code of `amount`, e.g. "EUR". Whop only; null elsewhere. */
  currency: string | null;
  /** Days each charge pays for. Whop only; null elsewhere. */
  billingPeriod: number | null;
  /** ISO date-time the next charge is due. Whop only; null elsewhere. */
  renewsAt: string | null;
  createdAt: string;
  updatedAt: string;
}
