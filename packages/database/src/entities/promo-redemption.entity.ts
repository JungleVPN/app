import type { PaymentMethod } from '@workspace/types';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * One row per promo actually applied to a successful payment.
 *
 * There is no `reserved` state: a row exists only once a payment settles and the
 * effect was granted. `UNIQUE(provider, paymentId)` makes redemption idempotent
 * across webhook retries; the `(promoCode, userId)` index backs the per-user cap.
 */
@Entity('promo_redemptions')
@Unique(['provider', 'paymentId'])
@Index(['promoCode', 'userId'])
export class PromoRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  promoCode: string;

  @Column()
  userId: string;

  /** Which provider's payment this redemption belongs to. */
  @Column({ type: 'varchar' })
  provider: PaymentMethod;

  /** The provider's payment/session id — the correlation key with the payment. */
  @Column()
  paymentId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  redeemedAt: Date;
}
