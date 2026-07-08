import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

type ReferralStatus = 'TRIAL' | 'COMPLETED';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Remnawave userId (uuid) of the inviter. */
  @Column({ type: 'varchar', unique: false })
  inviterId: string;

  /** Remnawave userId (uuid) of the invited user. */
  @Column({ type: 'varchar', unique: true })
  invitedId: string;

  @Column({
    type: 'varchar',
    default: 'TRIAL',
  })
  status: ReferralStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
