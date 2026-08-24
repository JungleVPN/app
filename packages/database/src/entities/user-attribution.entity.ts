import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_attribution')
export class UserAttribution {
  @PrimaryColumn({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar' })
  platform: string;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'varchar', nullable: true })
  medium: string | null;

  @Column({ type: 'varchar', nullable: true })
  campaign: string | null;

  @Column({ type: 'varchar', nullable: true })
  adset: string | null;

  @Column({ type: 'varchar', nullable: true })
  ad: string | null;

  @Column({ type: 'varchar', nullable: true })
  clickId: string | null;

  @Column({ type: 'varchar', nullable: true })
  adCode: string | null;

  @Column({ type: 'jsonb', nullable: true })
  raw: object | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
