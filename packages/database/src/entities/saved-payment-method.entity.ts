import type { SavedMethodStatus } from '@workspace/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('saved_payment_methods')
export class SavedPaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Remnawave numeric userId, consistent with YookassaPayment.userId */
  @Column({ type: 'int', nullable: false, unique: false })
  userId: number;

  @Column({ type: 'varchar', default: 'yookassa' })
  provider: string;

  /** YooKassa's payment_method.id — used as payment_method_id in autopayment requests */
  @Column({ nullable: false, unique: false })
  paymentMethodId: string;

  /** e.g. 'bank_card', 'yoo_money', 'sbp', 'sberbank' */
  @Column({ type: 'varchar' })
  paymentMethodType: string;

  /** Human-readable label, e.g. "Visa **** 4242" */
  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  /** Card details if payment_method.type === 'bank_card' */
  @Column({ type: 'jsonb', nullable: true })
  card: {
    last4?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cardType?: string;
    first6?: string;
    issuerCountry?: string;
  } | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** What the subscription is for, e.g. "Jungle VPN". Whop only. */
  @Column({ type: 'varchar', nullable: true })
  productName: string | null;

  /** Last amount charged, in major units of `currency`. Whop only. */
  @Column({ type: 'double precision', nullable: true })
  amount: number | null;

  /** Uppercase ISO code of `amount`, e.g. "EUR". Whop only. */
  @Column({ type: 'varchar', nullable: true })
  currency: string | null;

  /** Days each charge pays for. Whop only. */
  @Column({ type: 'int', nullable: true })
  billingPeriod: number | null;

  /** When the next charge is due: the last charge plus `billingPeriod`. Whop only. */
  @Column({ type: 'timestamptz', nullable: true })
  renewsAt: Date | null;

  /**
   * Whop only; null elsewhere, and on Whop rows saved before it was tracked.
   * A Whop row is never deleted — an ended membership becomes `terminated`.
   */
  @Column({ type: 'varchar', nullable: true })
  status: SavedMethodStatus | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
