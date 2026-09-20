import { Injectable, Logger } from '@nestjs/common';
import { GetNodesCommand } from '@workspace/types';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { GeoLookup } from './geo-lookup';
import { collectNodeIps } from './node-ips';
import { normalizeIp } from './normalize-ip';

export const NODE_CACHE_TTL_MS = 5 * 60 * 1000;

export type IpStatus = {
  ip: string | null;
  countryCode: string | null;
  /** `null` means "we could not tell" — never render that as "not protected". */
  protected: boolean | null;
};

@Injectable()
export class IpStatusService {
  private readonly logger = new Logger(IpStatusService.name);
  private nodeIps: Map<string, string> | null = null;
  private nodeIpsExpireAt = 0;
  private inFlight: Promise<Map<string, string> | null> | null = null;

  constructor(
    private readonly panelClient: RemnaPanelClient,
    private readonly geoLookup: GeoLookup,
  ) {}

  async resolve(rawIp: string | undefined | null): Promise<IpStatus> {
    const ip = normalizeIp(rawIp);
    if (!ip) return { ip: null, countryCode: null, protected: null };

    const nodeIps = await this.getNodeIps();

    // No node list at all — the honest answer is "unknown". Saying "not
    // protected" here would tell every connected customer they are exposed
    // for as long as the panel is unreachable.
    if (!nodeIps) {
      return { ip, countryCode: await this.geoLookup.lookupCountry(ip), protected: null };
    }

    const nodeCountry = nodeIps.get(ip);
    if (nodeCountry !== undefined) {
      return { ip, countryCode: nodeCountry, protected: true };
    }

    return { ip, countryCode: await this.geoLookup.lookupCountry(ip), protected: false };
  }

  private async getNodeIps(): Promise<Map<string, string> | null> {
    if (this.nodeIps && this.nodeIpsExpireAt > Date.now()) return this.nodeIps;

    // Collapse concurrent misses into one panel call: without this, the first
    // burst of visitors after a TTL expiry each trigger their own fetch.
    this.inFlight ??= this.refreshNodeIps().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async refreshNodeIps(): Promise<Map<string, string> | null> {
    try {
      const nodes = await this.panelClient.request<GetNodesCommand.Response['response']>({
        method: GetNodesCommand.endpointDetails.REQUEST_METHOD,
        url: GetNodesCommand.url,
      });

      this.nodeIps = collectNodeIps(nodes);
      this.nodeIpsExpireAt = Date.now() + NODE_CACHE_TTL_MS;
      return this.nodeIps;
    } catch (e) {
      // A stale list is far better than none: node addresses change rarely,
      // and the alternative is telling connected users they are unprotected.
      this.logger.error(`Failed to refresh node IPs: ${(e as Error).message}`);
      return this.nodeIps;
    }
  }
}
