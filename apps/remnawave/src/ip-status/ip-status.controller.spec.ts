/**
 * The public face of the banner. Two things it must get right:
 *
 * `req.ip` is only trustworthy because main.ts sets `trust proxy` to exactly
 * one hop, so Express reads the entry Caddy appended rather than one a visitor
 * put in the header themselves. Reading the raw `X-Forwarded-For` here instead
 * would let anyone claim a node address and be told they are protected.
 *
 * And the answer is per-visitor, so it must never be cached — by a CDN, by
 * Caddy, or by the browser.
 */

import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { IpStatusController } from './ip-status.controller';
import type { IpStatusService } from './ip-status.service';

const status = { ip: '81.84.17.141', countryCode: 'PT', protected: false };

function makeController() {
  const resolve = vi.fn(async () => status);
  const res = { set: vi.fn() };
  const controller = new IpStatusController({ resolve } as unknown as IpStatusService);
  return { controller, resolve, res };
}

describe('IpStatusController', () => {
  it('answers with the status of the address Express resolved for the request', async () => {
    const { controller, resolve, res } = makeController();

    const body = await controller.getIpStatus({ ip: '81.84.17.141' } as never, res as never);

    expect(resolve).toHaveBeenCalledWith('81.84.17.141');
    expect(body).toEqual(status);
  });

  it('ignores a visitor-supplied X-Forwarded-For, which anyone can set', async () => {
    const { controller, resolve, res } = makeController();

    await controller.getIpStatus(
      { ip: '81.84.17.141', headers: { 'x-forwarded-for': '152.53.3.94' } } as never,
      res as never,
    );

    expect(resolve).toHaveBeenCalledWith('81.84.17.141');
  });

  it("forbids caching, so one visitor is never shown another visitor's address", async () => {
    const { controller, res } = makeController();

    await controller.getIpStatus({ ip: '1.1.1.1' } as never, res as never);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });
});
