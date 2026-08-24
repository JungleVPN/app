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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
