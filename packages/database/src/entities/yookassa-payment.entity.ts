import type { PaymentPurpose } from '@workspace/types';
import { Payments } from '@workspace/types';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { bigintTransformer } from '../utils/transformers';

@Entity('yookassa_payments')
export class YookassaPayment {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: false })
  userId: string;

  @Column({ nullable: false })
  amount: string;

  @Column({ type: 'varchar', default: 'RUB' })
  currency: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: Payments.PaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ nullable: false })
  selectedPeriod: number;

  @Column({ type: 'bigint', nullable: true, transformer: bigintTransformer })
  telegramId: number | null;

  /** What this payment is for. Autopayment rows default to 'subscription'. */
  @Column({ type: 'varchar', default: 'subscription' })
  purpose: PaymentPurpose;

  /**
   * Promo code applied at checkout, if any. The carrier between the create and
   * fulfillment phases — the promo's effect is resolved from the `promos` table
   * at fulfillment, keeping promotion details out of the payment row.
   */
  @Column({ type: 'varchar', nullable: true })
  promoCode: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
