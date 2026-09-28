import { Injectable, Logger } from '@nestjs/common';
import { apiRoutes } from '@workspace/types';
import axios from 'axios';

const LOOKUP_TIMEOUT_MS = 3_000;

/**
 * The country of a visitor's address, as the remnawave service's IP lookup
 * sees it — the same answer the site's IP banner shows. A visitor on one of
 * our nodes gets the node's country.
 */
@Injectable()
export class VisitorCountryClient {
  private readonly logger = new Logger(VisitorCountryClient.name);

  /** Null when the address is missing or the lookup cannot tell — never throws. */
  async countryOf(ip: string | null): Promise<string | null> {
    if (!ip) return null;

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
      return null;
    }
  }

  private get remnawaveBaseUrl(): string {
    return process.env.REMNAWAVE_URL || 'http://localhost:3002/remnawave';
  }
}
