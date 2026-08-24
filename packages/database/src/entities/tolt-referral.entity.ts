import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Affiliate attribution captured for a user, decoupled from the moment of payment.
 *
 * The `?aff=` link is resolved to a partner when the visitor lands, but that
 * context is gone by the time a provider webhook fires — which
 * may be days later, on a different device, or (for renewals) months later with
 * no browser involved at all. Persisting it here is what lets any payment
 * provider report a conversion without knowing anything about Tolt.
 *
 * Last click wins, until it doesn't: while `convertedAt` is null a newer
 * referral replaces this row, so the partner whose link actually brought the
 * user back is the one credited. Once they pay, the row is frozen for life —
 * renewal commissions belong to whoever made the sale.
 */
@Entity('tolt_referral')
export class ToltReferral {
  /** Remnawave numeric userId. */
  @PrimaryColumn({ type: 'int' })
  userId: number;

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
   * The user's email at capture time, used as Tolt's customer identifier when
   * the customer is finally created.
   */
  @Column({ type: 'varchar', nullable: false })
  email: string;

  /**
   * Tolt's own customer id, created on the user's first payment — never before.
   *
   * Tolt fixes a customer's `partner_id` at creation and offers no way to move
   * them, so creating one early would lock attribution to whoever happened to
   * refer the user first. Deferring it until money actually moves means the
   * partner who converted them is the one recorded, with nothing to reassign.
   */
  @Column({ type: 'varchar', nullable: true })
  toltCustomerId: string | null;

  /**
   * When the user first converted, freezing this attribution.
   *
   * Null means no payment yet, and the row is still overwritable: a later
   * referral replaces it, so whoever's link is live when the user finally pays
   * gets the credit. The browser cookie supplies the window: it is replaced on
   * every new affiliate landing and expires after 30 days.
   *
   * Once set, the row never changes again: the commission on renewals belongs
   * to the partner who made the sale.
   */
  @Column({ type: 'timestamptz', nullable: true })
  convertedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
