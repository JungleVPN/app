import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * One row per Whop refund we have reported. Whop announces a refund on
 * `refund.created` and again on every `refund.updated`, so the primary-key
 * insert is what makes each refund reach analytics and Tolt exactly once.
 */
@Entity('whop_refunds')
export class WhopRefund {
  /** Whop refund id. */
  @PrimaryColumn()
  id: string;

  /** The Whop payment id (`pay_...`) the refund reverses. */
  @Column({ type: 'varchar' })
  paymentId: string;

  /** Amount refunded, in major units of `currency`. */
  @Column({ type: 'double precision' })
  amount: number;

  @Column({ type: 'varchar' })
  currency: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
