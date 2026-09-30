/**
 * Public node statistics for the landing page's Stats block.
 *
 * The panel's node objects carry addresses, ports, provider logins, traffic
 * counters and hardware details — none of which a stranger should see. Only
 * the five fields the Stats block renders may leave this service.
 *
 * The endpoint is anonymous, so each visitor must not cost a panel call: the
 * list is cached, concurrent misses share one fetch, and a panel outage serves
 * the last list we had instead of an error.
 */

import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import { GetNodesCommand } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemnaPanelClient } from '../common/remna-panel.client';
import { NODE_STATS_CACHE_TTL_MS, NodeStatsService } from './node-stats.service';

const panelNode = (overrides: Record<string, unknown> = {}) => ({
  uuid: '6f1c9c8e-0000-4000-8000-000000000001',
  name: 'Vienna',
  address: '152.53.3.94',
  port: 2222,
  isConnected: true,
  isDisabled: false,
  countryCode: 'AT',
  trafficUsedBytes: 123456,
  provider: { uuid: 'p', name: 'Netcup', loginUrl: 'https://secret.example' },
  system: {
    info: { hostname: 'vie-1', cpus: 4, memoryTotal: 8_000 },
    stats: { memoryFree: 3_000, memoryUsed: 5_000, uptime: 86_400, loadAvg: [0.1] },
  },
  ...overrides,
});

function makeService({ nodes = [panelNode()] as unknown[], panelFails = false } = {}) {
  const request = vi.fn(async () => {
    if (panelFails) throw new Error('panel down');
    return nodes;
  });
  const service = new NodeStatsService({ request } as unknown as RemnaPanelClient);
  return { service, request };
}

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('NodeStatsService.list', () => {
  it('returns only name, isConnected, countryCode, uptime and memoryUsed for each node', async () => {
    const { service } = makeService();

    await expect(service.list()).resolves.toStrictEqual([
      { name: 'Vienna', isConnected: true, countryCode: 'AT', uptime: 86_400, memoryUsed: 5_000 },
    ]);
  });

  it('reports uptime and memory as unknown for a node that has not reported its system yet', async () => {
    const { service } = makeService({ nodes: [panelNode({ system: null, isConnected: false })] });

    await expect(service.list()).resolves.toStrictEqual([
      { name: 'Vienna', isConnected: false, countryCode: 'AT', uptime: null, memoryUsed: null },
    ]);
  });

  it('leaves disabled nodes out, since they are not part of the service', async () => {
    const { service } = makeService({
      nodes: [panelNode(), panelNode({ name: 'Retired', isDisabled: true })],
    });

    const stats = await service.list();

    expect(stats.map((s) => s.name)).toEqual(['Vienna']);
  });

  it('asks the panel for the node list', async () => {
    const { service, request } = makeService();

    await service.list();

    expect(request).toHaveBeenCalledWith({ method: 'get', url: GetNodesCommand.url });
  });

  it('serves repeat visitors from cache within the TTL', async () => {
    const { service, request } = makeService();

    await service.list();
    await service.list();

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL has passed', async () => {
    vi.useFakeTimers();
    const { service, request } = makeService();

    await service.list();
    vi.advanceTimersByTime(NODE_STATS_CACHE_TTL_MS + 1);
    await service.list();

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('shares one panel call between concurrent cache misses', async () => {
    const { service, request } = makeService();

    await Promise.all([service.list(), service.list(), service.list()]);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('keeps serving the last known list when the panel fails', async () => {
    vi.useFakeTimers();
    const nodes = [panelNode()];
    const request = vi
      .fn()
      .mockResolvedValueOnce(nodes)
      .mockRejectedValueOnce(new Error('panel down'));
    const service = new NodeStatsService({ request } as unknown as RemnaPanelClient);

    const first = await service.list();
    vi.advanceTimersByTime(NODE_STATS_CACHE_TTL_MS + 1);
    const second = await service.list();

    expect(second).toEqual(first);
  });

  it('answers 503 when the panel fails and nothing has been cached yet', async () => {
    const { service } = makeService({ panelFails: true });

    await expect(service.list()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
