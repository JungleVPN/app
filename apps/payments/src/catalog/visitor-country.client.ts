import { Injectable, Logger } from '@nestjs/common';
import { apiRoutes } from '@workspace/types';
import axios from 'axios';

const LOOKUP_TIMEOUT_MS = 3_000;

/**
 * An address keeps its country for longer than a visit lasts, and is looked up
 * when the plans are priced and again at checkout, so an answer is reused for
 * a while. The count is capped so a stream of new addresses cannot grow it
 * without bound.
 */
const REMEMBER_MS = 10 * 60 * 1000;
const REMEMBER_MAX = 1000;

/** A lookup that failed, which is not remembered: the next visitor's lookup tries again. */
const FAILED = Symbol('failed');

type RememberedCountry = { countryCode: string | null; expiresAt: number };

/**
 * The country of a visitor's address, as the remnawave service's IP lookup
 * sees it — the same answer the site's IP banner shows. A visitor on one of
 * our nodes gets the node's country.
 */
@Injectable()
export class VisitorCountryClient {
  private readonly logger = new Logger(VisitorCountryClient.name);

  /** Answers by address, oldest first, so the oldest is the one forgotten when full. */
  private readonly remembered = new Map<string, RememberedCountry>();

  /** Null when the address is missing or the lookup cannot tell — never throws. */
  async countryOf(ip: string | null): Promise<string | null> {
    if (!ip) return null;

    const remembered = this.remembered.get(ip);
    if (remembered && remembered.expiresAt > Date.now()) return remembered.countryCode;

    const countryCode = await this.lookUp(ip);
    if (countryCode === FAILED) return null;
    this.remember(ip, countryCode);
    return countryCode;
  }

  private remember(ip: string, countryCode: string | null): void {
    this.remembered.delete(ip);
    this.remembered.set(ip, { countryCode, expiresAt: Date.now() + REMEMBER_MS });
    if (this.remembered.size <= REMEMBER_MAX) return;
    const oldest = this.remembered.keys().next().value;
    if (oldest !== undefined) this.remembered.delete(oldest);
  }

  private async lookUp(ip: string): Promise<string | null | typeof FAILED> {
    try {
      const { data } = await axios.get<{ countryCode: string | null }>(
        `${this.remnawaveBaseUrl}${apiRoutes.remnawave.ipStatusLookup}`,
        {
          params: { ip },
          headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET },
          timeout: LOOKUP_TIMEOUT_MS,
        },
      );
      return data.countryCode ?? null;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to look up the visitor country: ${detail}`);
      return FAILED;
    }
  }

  private get remnawaveBaseUrl(): string {
    return process.env.REMNAWAVE_URL || 'http://localhost:3002/remnawave';
  }
}
