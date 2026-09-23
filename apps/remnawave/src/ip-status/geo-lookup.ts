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

export type IpGeoData = {
  countryCode: string | null;
  city: string | null;
  isp: string | null;
  latitude: number | null;
  longitude: number | null;
};

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
  private readonly cache = new Map<string, IpGeoData & { expiresAt: number }>();

  async lookup(ip: string): Promise<IpGeoData> {
    const key = normalizeIp(ip);
    if (!key) return { countryCode: null, city: null, isp: null, latitude: null, longitude: null };

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const data = await this.fetch(key);
    this.remember(key, data);
    return data;
  }

  async lookupCountry(ip: string): Promise<string | null> {
    return (await this.lookup(ip)).countryCode;
  }

  private async fetch(ip: string): Promise<IpGeoData> {
    try {
      const response = await fetch(
        `https://ipwho.is/${encodeURIComponent(ip)}?fields=city,country_code,latitude,longitude,connection.isp`,
        {
          signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
        },
      );
      if (!response.ok)
        return { countryCode: null, city: null, isp: null, latitude: null, longitude: null };

      const body = (await response.json()) as {
        connection?: { isp?: string | null };
        city?: string;
        country_code?: string;
        latitude?: number;
        longitude?: number;
      };
      return {
        countryCode: body.country_code ?? null,
        city: body.city ?? null,
        isp: body.connection?.isp ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
      };
    } catch (e) {
      // A banner with no flag is a cosmetic loss; it must never fail the
      // request or delay it past the timeout above.
      this.logger.warn(`Geo lookup failed for ${ip}: ${(e as Error).message}`);
      return { countryCode: null, city: null, isp: null, latitude: null, longitude: null };
    }
  }

  private remember(ip: string, data: IpGeoData) {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    this.cache.set(ip, { ...data, expiresAt: Date.now() + CACHE_TTL_MS });
  }
}
