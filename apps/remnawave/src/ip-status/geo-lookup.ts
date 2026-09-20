import { Injectable, Logger } from '@nestjs/common';
import { normalizeIp } from './normalize-ip';

const LOOKUP_TIMEOUT_MS = 2_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Bounded so a crawler walking the site from a fresh address every request
 * cannot grow this map without limit. Oldest insertion is evicted first, which
 * is close enough to least-recently-used for a landing-page banner.
 */
const CACHE_MAX_ENTRIES = 3_000;

/**
 * Country of an address we do *not* own.
 *
 * Only unprotected visitors reach here — a visitor exiting through one of our
 * nodes already has a country from the panel — so this is a miss-path cost,
 * not a per-request one.
 */
@Injectable()
export class GeoLookup {
  private readonly logger = new Logger(GeoLookup.name);
  private readonly cache = new Map<string, { countryCode: string | null; expiresAt: number }>();

  async lookupCountry(ip: string): Promise<string | null> {
    const key = normalizeIp(ip);
    if (!key) return null;

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.countryCode;

    const countryCode = await this.fetchCountry(key);
    this.remember(key, countryCode);
    return countryCode;
  }

  private async fetchCountry(ip: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://ipwho.is/${encodeURIComponent(ip)}?fields=country_code`,
        {
          signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
        },
      );
      if (!response.ok) return null;

      const body = (await response.json()) as { country_code?: string };
      return body.country_code ?? null;
    } catch (e) {
      // A banner with no flag is a cosmetic loss; it must never fail the
      // request or delay it past the timeout above.
      this.logger.warn(`Geo lookup failed for ${ip}: ${(e as Error).message}`);
      return null;
    }
  }

  private remember(ip: string, countryCode: string | null) {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    this.cache.set(ip, { countryCode, expiresAt: Date.now() + CACHE_TTL_MS });
  }
}
