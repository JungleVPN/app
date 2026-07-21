import type { PromoEffect, PromoEligibility } from '@workspace/types';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * A promotional code. Campaigns are rows here, not code — see PromoEffect.
 * `code` is the primary key and is expected to be stored upper-cased.
 */
@Entity('promos')
export class Promo {
  @PrimaryColumn()
  code: string;

  /** What redeeming this promo does (e.g. { type: 'bonus_months', months: 2 }). */
  @Column({ type: 'jsonb' })
  effect: PromoEffect;

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

  /** Kill switch independent of the date window. */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  /** Stripe `promotion_code` object ID (format: `promo_xxx`). Set manually after creating in Stripe dashboard. */
  @Column({ type: 'varchar', nullable: true })
  stripePromoCodeId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
