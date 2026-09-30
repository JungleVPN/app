/**
 * The public face of the Stats block. Every visitor sees the same answer, so
 * unlike /ip-status it may be cached by browsers and proxies — briefly, so a
 * node going down shows up within a minute.
 */

import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { NodeStatsController } from './node-stats.controller';
import type { NodeStatsService } from './node-stats.service';

const stats = [
  { name: 'Vienna', isConnected: true, countryCode: 'AT', uptime: 86_400, memoryUsed: 5_000 },
];

function makeController() {
  const list = vi.fn(async () => stats);
  const res = { set: vi.fn() };
  const controller = new NodeStatsController({ list } as unknown as NodeStatsService);
  return { controller, res };
}

describe('NodeStatsController', () => {
  it('answers with the node statistics', async () => {
    const { controller, res } = makeController();

    await expect(controller.getStats(res as never)).resolves.toEqual(stats);
  });

  it('lets shared caches hold the answer for a short while', async () => {
    const { controller, res } = makeController();

    await controller.getStats(res as never);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=60');
  });
});
