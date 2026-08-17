import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Last-good foreign exchange rate, persisted as a final fallback.
 *
 * YooKassa charges in RUB but Tolt transactions must be posted in the program's
 * currency (EUR) — `POST /v1/transactions` has no currency field. The rate is
 * fetched live (CBR primary, open.er-api fallback) and cached in memory, but a
 * process restart plus both providers being unreachable would otherwise leave a
 * webhook with no rate at all.
 *
 * A stale rate is far better than a missing commission: FX moves by fractions of
 * a percent per day, while a dropped conversion is a partner not getting paid.
 * Callers decide how stale is too stale via `fetchedAt`.
 */
@Entity('fx_rate')
export class FxRate {
  /** Currency pair, `<base>_<quote>` — e.g. `EUR_RUB`. */
  @PrimaryColumn({ type: 'varchar' })
  pair: string;

  /** Units of `quote` per one unit of `base`. Numeric, not float — FX must not drift. */
  @Column({ type: 'numeric', precision: 18, scale: 8 })
  rate: string;

  /** Which provider supplied this rate, for debugging a suspicious conversion. */
  @Column({ type: 'varchar' })
  source: string;

  /** When the rate was last successfully fetched. Drives staleness decisions. */
  @Column({ type: 'timestamptz' })
  fetchedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
