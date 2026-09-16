import type { PaymentPurpose } from '@workspace/types';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('paddle_payments')
export class PaddlePayment {
  /** Paddle transaction id (`txn_...`) — one row per settled/failed transaction. */
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true, type: 'int' })
  userId: number | null;

  /** Paddle customer id (`ctm_...`). */
  @Column({ nullable: true, type: 'varchar' })
  customer: string | null;

  @Column({ nullable: true, type: 'varchar' })
  subscriptionId: string | null;

  /** Amount in major currency units, in whatever currency Paddle settled the transaction. */
  @Column({ type: 'double precision', nullable: true })
  amount: number | null;

  @Column({ type: 'varchar', nullable: true })
  currency: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'varchar', default: 'subscription' })
  purpose: PaymentPurpose;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
