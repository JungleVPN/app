import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Affiliate attribution captured for a user, decoupled from the moment of payment.
 *
 * `tlt.js` resolves the `?aff=` link into a referral code and partner id in the
 * browser, but that context is gone by the time a provider webhook fires — which
 * may be days later, on a different device, or (for renewals) months later with
 * no browser involved at all. Persisting it here is what lets any payment
 * provider report a conversion without knowing anything about Tolt.
 *
 * Write-once on `userId`: the first affiliate to refer a user keeps the credit,
 * matching the "attribute only on a user's first-ever payment" rule already
 * enforced in `stripe.provider.ts`. Later captures for the same user are ignored.
 */
@Entity('tolt_referral')
export class ToltReferral {
  /** Remnawave user uuid. */
  @PrimaryColumn({ type: 'varchar' })
  userId: string;

  /** The partner's referral code — `window.tolt_referral`. */
  @Column({ type: 'varchar' })
  referralCode: string;

  /** `window.tolt_data.partner_id`. Required by `POST /v1/customers`. */
  @Column({ type: 'varchar' })
  partnerId: string;

  /** `window.tolt_data.click_id`, when the click was attributable. */
  @Column({ type: 'varchar', nullable: true })
  clickId: string | null;

  /**
   * Tolt's own customer id, set at capture time by registering the user as a
   * `lead` — so partners see the full click → lead → conversion funnel rather
   * than conversions appearing from nowhere.
   *
   * Null therefore means lead registration did not succeed (Tolt unreachable,
   * bad key), not "hasn't paid yet". `reportConversion` treats a null as a
   * self-heal cue and registers the customer before posting the transaction,
   * so a failed capture costs visibility but never a commission.
   */
  @Column({ type: 'varchar', nullable: true })
  toltCustomerId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
