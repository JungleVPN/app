import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('analytics_events')
@Index(['userId', 'occurredAt'])
@Index(['event', 'occurredAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  event: string;

  @Column({ type: 'text', nullable: true })
  userId: string | null;

  @Index({ where: '"telegram_id" IS NOT NULL' })
  @Column({ type: 'bigint', nullable: true })
  telegramId: number | null;

  @Column({ type: 'text', nullable: true })
  sessionId: string | null;

  @Column({ type: 'text', nullable: true })
  platform: string | null;

  @Column({ type: 'text', nullable: true })
  channel: string | null;

  @Index({ where: '"ad_code" IS NOT NULL' })
  @Column({ type: 'text', nullable: true })
  adCode: string | null;

  @Column({ type: 'text', nullable: true })
  source: string | null;

  @Column({ type: 'jsonb', nullable: true })
  properties: object | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  occurredAt: Date;
}
