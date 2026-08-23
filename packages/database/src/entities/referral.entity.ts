import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

type ReferralStatus = 'TRIAL' | 'COMPLETED';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Remnawave numeric userId of the inviter. */
  @Column({ type: 'int', unique: false })
  inviterId: number;

  /** Remnawave numeric userId of the invited user. */
  @Column({ type: 'int', unique: true })
  invitedId: number;

  @Column({
    type: 'varchar',
    default: 'TRIAL',
  })
  status: ReferralStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
