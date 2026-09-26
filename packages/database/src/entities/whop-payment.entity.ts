import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('whop_payments')
export class WhopPayment {
  /** Whop payment id (`pay_...`) — one row per settled/failed payment. */
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true, type: 'int' })
  userId: number | null;

  /** Whop user id (`user_...`) of the payer. */
  @Column({ nullable: true, type: 'varchar' })
  customer: string | null;

  /** Whop membership id (`mem_...`) — Whop's equivalent of a subscription. */
  @Column({ nullable: true, type: 'varchar' })
  membershipId: string | null;

  /** Amount in major currency units, in whatever currency Whop settled the payment. */
  @Column({ type: 'double precision', nullable: true })
  amount: number | null;

  @Column({ type: 'varchar', nullable: true })
  currency: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
