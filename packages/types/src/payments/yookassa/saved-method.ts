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
  createdAt: string;
  updatedAt: string;
}
