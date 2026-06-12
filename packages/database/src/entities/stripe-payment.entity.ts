import type { PaymentPurpose } from '@workspace/types';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('stripe_payments')
export class StripePayment {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true, type: 'varchar' })
  userId: string | null;

  @Column({ nullable: true, type: 'varchar' })
  customer: string | null;

  @Column({ nullable: true, type: 'varchar' })
  stripeSubscriptionId: string | null;

  @Column({ type: 'int', nullable: true })
  amount: number | null;

  @Column({ type: 'varchar', default: 'EUR' })
  currency: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  @Column({ type: 'varchar', nullable: true })
  invoiceUrl: string | null;

  @Column({ type: 'varchar', default: 'subscription' })
  purpose: PaymentPurpose;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
