import type { PromoDuration, PromoEffect, PromoEligibility, PromoScope } from '@workspace/types';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * A promotional code. Campaigns are rows here, not code — see PromoEffect.
 * `code` is the primary key and is expected to be stored upper-cased.
 */
@Entity('promos')
export class Promo {
  @PrimaryColumn()
  code: string;

  /** What redeeming this promo does (e.g. { type: 'percentage', percent: 10 }). */
  @Column({ type: 'jsonb' })
  effect: PromoEffect;

  /** How many payments a discount applies to. */
  @Column({ type: 'varchar', default: 'forever' })
  duration: PromoDuration;

  /** Payments the discount lasts for when `duration` is `multiple_months`. */
  @Column({ type: 'int', nullable: true })
  durationMonths: number | null;

  /** Plan lengths in days the promo applies to. Null = every plan. */
  @Column({ type: 'int', array: true, nullable: true })
  planPeriods: number[] | null;

  /** Campaign window. Null bounds mean "no lower/upper bound". */
  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  /** Global redemption cap across all users. Null = unlimited. */
  @Column({ type: 'int', nullable: true })
  maxRedemptions: number | null;

  /** How many times a single user may redeem this promo. */
  @Column({ type: 'int', default: 1 })
  perUserLimit: number;

  /**
   * Who may redeem. `expired_only` requires the payer's subscription to be EXPIRED.
   * `new` requires the payer to have never had a settled payment.
   */
  @Column({ type: 'varchar', default: 'all' })
  eligibility: PromoEligibility;

  /**
   * Storefront the promo belongs to; `all` offers it on every storefront.
   * Existing promos predate `global` and are RU.
   */
  @Column({ type: 'varchar', default: 'ru' })
  scope: PromoScope;

  /** Advertised on the checkout email step of its storefront. */
  @Column({ type: 'boolean', default: false })
  featured: boolean;

  /** Kill switch independent of the date window. */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
