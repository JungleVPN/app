import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FxRate } from '@workspace/database';
import { Repository } from 'typeorm';
import type { ParsedRate } from './fx-rate.parsers';

export const FX_SOURCES = Symbol('FX_SOURCES');

export type RateSource = {
  name: string;
  fetchRate(): Promise<ParsedRate>;
};

const PAIR = 'EUR_RUB';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Resolves the RUB→EUR rate for Tolt transaction reporting.
 *
 * `POST /v1/transactions` carries no currency field — amounts are read in the
 * program's currency (EUR) — so RUB charges from YooKassa must be converted
 * before they are reported.
 *
 * Availability is prioritised over freshness at every level: sources are tried
 * in order, then an in-memory cache, then the last rate ever persisted. CBR
 * publishes once per business day and the pair moves by fractions of a percent,
 * so a stale rate is a rounding difference — while an unresolvable rate is a
 * partner not getting paid. Callers get `null` only when no rate has ever been
 * seen, and must skip reporting rather than guess.
 */
@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);
  private cached: { rate: number; at: number } | null = null;

  constructor(
    @InjectRepository(FxRate) private readonly repository: Repository<FxRate>,
    @Inject(FX_SOURCES) private readonly sources: RateSource[],
    // Injected so cache expiry is testable without fake timers.
    private readonly now: () => number = Date.now,
  ) {}

  /** Roubles per euro, or null when no rate can be resolved from any layer. */
  async getEurRubRate(): Promise<number | null> {
    if (this.cached && this.now() - this.cached.at < CACHE_TTL_MS) {
      return this.cached.rate;
    }

    for (const source of this.sources) {
      const rate = await this.tryFetch(source);
      if (rate === null) continue;

      this.cached = { rate, at: this.now() };
      await this.persist(rate, source.name);
      return rate;
    }

    return this.lastGood();
  }

  /**
   * Converts a RUB amount in major units to EUR minor units (cents).
   * Null when the amount is not positive or no rate is available.
   */
  async convertRubToEurCents(rubMajor: number): Promise<number | null> {
    if (!Number.isFinite(rubMajor) || rubMajor <= 0) {
      this.logger.warn(`Refusing to convert non-positive RUB amount: ${rubMajor}`);
      return null;
    }

    const rate = await this.getEurRubRate();
    if (rate === null) {
      this.logger.error(`No ${PAIR} rate available — cannot convert ${rubMajor} RUB`);
      return null;
    }

    return Math.round((rubMajor / rate) * 100);
  }

  /** Fetches from one source, converting any failure into null. */
  private async tryFetch(source: RateSource): Promise<number | null> {
    try {
      const { rate } = await source.fetchRate();
      if (!Number.isFinite(rate) || rate <= 0) {
        this.logger.warn(`FX source ${source.name} returned an unusable rate: ${rate}`);
        return null;
      }
      return rate;
    } catch (error) {
      this.logger.warn(`FX source ${source.name} failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Best-effort write of the last-good rate. A failure here must not fail the
   * lookup — the caller already has a usable rate in hand.
   */
  private async persist(rate: number, source: string): Promise<void> {
    try {
      await this.repository.save({
        pair: PAIR,
        rate: String(rate),
        source,
        fetchedAt: new Date(this.now()),
      });
    } catch (error) {
      this.logger.warn(`Could not persist ${PAIR} rate: ${(error as Error).message}`);
    }
  }

  /** The last rate ever persisted — used only when every source is unreachable. */
  private async lastGood(): Promise<number | null> {
    try {
      const row = await this.repository.findOneBy({ pair: PAIR });
      if (!row) {
        this.logger.error(`All FX sources failed and no persisted ${PAIR} rate exists`);
        return null;
      }

      const rate = Number(row.rate);
      if (!Number.isFinite(rate) || rate <= 0) return null;

      const ageHours = Math.round((this.now() - row.fetchedAt.getTime()) / 3_600_000);
      this.logger.warn(`All FX sources failed — using ${ageHours}h-old persisted rate ${rate}`);
      return rate;
    } catch (error) {
      this.logger.error(`Could not read persisted ${PAIR} rate: ${(error as Error).message}`);
      return null;
    }
  }
}
