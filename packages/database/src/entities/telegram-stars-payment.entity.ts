import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('telegram_stars_payments')
export class TelegramStarsPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  userId: string;

  @Column({ type: 'int', nullable: false })
  starsAmount: number;

  @Column({ nullable: false })
  selectedPeriod: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'succeeded' | 'refunded';

  /** Telegram's charge id — required for refunds via refundStarPayment() */
  @Column({ type: 'varchar', nullable: true })
  telegramPaymentChargeId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
