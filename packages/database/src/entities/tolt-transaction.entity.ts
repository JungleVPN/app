import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Maps a provider charge to the Tolt transaction reported for it.
 *
 * Refunding requires Tolt's own transaction id, and Tolt offers no way to look
 * one up by `charge_id` — `GET /v1/transactions` filters only by customer or
 * partner. Without this mapping a refund could not be matched to the commission
 * it should reverse.
 *
 * Keyed by the provider's charge id, which is unique across providers (a Stripe
 * invoice id and a YooKassa payment id are both globally unique). That doubles
 * as reporting idempotency: a row here means the charge was already reported.
 */
@Entity('tolt_transaction')
@Index(['userId'])
export class ToltTransaction {
  /** The provider's charge id — Stripe invoice id, YooKassa payment id. */
  @PrimaryColumn({ type: 'varchar' })
  chargeId: string;

  /**
   * Tolt's transaction id, the handle its refund endpoint takes.
   *
   * Null while the charge is only claimed: the row is written before the report
   * is posted, so that a commission can never exist in Tolt without a local
   * record of the charge it belongs to. A row still null after the fact means
   * the report never confirmed and needs reconciling by hand.
   */
  @Column({ type: 'varchar', nullable: true })
  toltTransactionId: string | null;

  @Column({ type: 'varchar' })
  userId: string;

  /** Which provider settled the charge — `stripe`, `yookassa`, … */
  @Column({ type: 'varchar' })
  provider: string;

  /** What was reported to Tolt, in EUR minor units. */
  @Column({ type: 'int' })
  amountCents: number;

  /**
   * When the commission was reversed in Tolt.
   *
   * Null means live. Set once, so a repeated refund webhook — YooKassa retries
   * them — cannot reverse the same commission twice.
   */
  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
