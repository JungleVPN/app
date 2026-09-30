import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GetNodesCommand, type NodeStatDto } from '@workspace/types';
import { RemnaPanelClient } from '../common/remna-panel.client';

export const NODE_STATS_CACHE_TTL_MS = 60 * 1000;

type PanelNode = GetNodesCommand.Response['response'][number];

/**
 * The one-minute load average per core: 1 is every core busy, above 1 is a
 * queue. Unknown without both figures rather than a misleading 0.
 */
const cpuLoad = (system: PanelNode['system']): number | null => {
  const oneMinute = system?.stats.loadAvg[0];
  const cores = system?.info.cpus;
  if (oneMinute === undefined || !cores) return null;
  return oneMinute / cores;
};

/**
 * Built field by field rather than by omitting: a new field the panel adds
 * must stay private until someone decides to publish it.
 */
const toNodeStat = (node: PanelNode): NodeStatDto => ({
  name: node.name,
  isConnected: node.isConnected,
  countryCode: node.countryCode,
  uptime: node.system?.stats.uptime ?? null,
  memoryUsed: node.system?.stats.memoryUsed ?? null,
  memoryTotal: node.system?.info.memoryTotal ?? null,
  cpuLoad: cpuLoad(node.system),
});

@Injectable()
export class NodeStatsService {
  private readonly logger = new Logger(NodeStatsService.name);
  private stats: NodeStatDto[] | null = null;
  private statsExpireAt = 0;
  private inFlight: Promise<NodeStatDto[] | null> | null = null;

  constructor(private readonly panelClient: RemnaPanelClient) {}

  async list(): Promise<NodeStatDto[]> {
    if (this.stats && this.statsExpireAt > Date.now()) return this.stats;

    // Collapse concurrent misses into one panel call, as IpStatusService does.
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = null;
    });

    const stats = await this.inFlight;
    if (!stats) throw new ServiceUnavailableException('Node statistics are unavailable');
    return stats;
  }

  private async refresh(): Promise<NodeStatDto[] | null> {
    try {
      const nodes = await this.panelClient.request<GetNodesCommand.Response['response']>({
        method: GetNodesCommand.endpointDetails.REQUEST_METHOD,
        url: GetNodesCommand.url,
      });

      this.stats = nodes.filter((node) => !node.isDisabled).map(toNodeStat);
      this.statsExpireAt = Date.now() + NODE_STATS_CACHE_TTL_MS;
      return this.stats;
    } catch (e) {
      this.logger.error(`Failed to refresh node stats: ${(e as Error).message}`);
      return this.stats;
    }
  }
}
