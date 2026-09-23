/**
 * Answering "are you behind our VPN?" for an anonymous landing-page visitor.
 *
 * Two things make this more than a set lookup. The node list comes from the
 * panel, which is a network call this endpoint cannot afford per visitor — so
 * it is cached, and a panel outage must not silently flip every visitor to
 * "not protected". And the country of a *protected* visitor is already known
 * from the node they exit through, so only unprotected visitors cost a geo
 * lookup.
 */

import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemnaPanelClient } from '../common/remna-panel.client';
import type { GeoLookup } from './geo-lookup';
import { IpStatusService, NODE_CACHE_TTL_MS } from './ip-status.service';

const NODES = [
  { address: '152.53.3.94', countryCode: 'AT', isDisabled: false, ips: [] },
  { address: '65.108.214.39', countryCode: 'FI', isDisabled: false, ips: [] },
];

function makeService({
  nodes = NODES as unknown[],
  panelFails = false,
  country = 'PT',
  city = 'Lisbon',
  isp = 'Test ISP',
  latitude = 38.7223,
  longitude = -9.1393,
}: {
  nodes?: unknown[];
  panelFails?: boolean;
  country?: string | null;
  city?: string | null;
  isp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
} = {}) {
  const request = vi.fn(async () => {
    if (panelFails) throw new Error('panel down');
    return nodes;
  });
  const lookup = vi.fn(async () => ({ countryCode: country, city, isp, latitude, longitude }));

  const service = new IpStatusService(
    { request } as unknown as RemnaPanelClient,
    { lookup } as unknown as GeoLookup,
  );
  return { service, request, lookup };
}

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('IpStatusService.resolve', () => {
  it('reports a visitor exiting through a node as protected', async () => {
    const { service } = makeService();

    expect(await service.resolve('152.53.3.94')).toEqual({
      ip: '152.53.3.94',
      countryCode: 'AT',
      city: 'Lisbon',
      isp: 'Test ISP',
      latitude: 38.7223,
      longitude: -9.1393,
      protected: true,
    });
  });

  it("takes a protected visitor's country from their exit node, with no geo lookup", async () => {
    const { service, lookup } = makeService();

    const status = await service.resolve('65.108.214.39');

    expect(status.countryCode).toBe('FI');
    expect(lookup).toHaveBeenCalledWith('65.108.214.39');
  });

  it('reports an unrecognised address as unprotected and geolocates it', async () => {
    const { service, lookup } = makeService({ country: 'PT' });

    expect(await service.resolve('81.84.17.141')).toEqual({
      ip: '81.84.17.141',
      countryCode: 'PT',
      city: 'Lisbon',
      isp: 'Test ISP',
      latitude: 38.7223,
      longitude: -9.1393,
      protected: false,
    });
    expect(lookup).toHaveBeenCalledWith('81.84.17.141');
  });

  it('matches the IPv4-mapped form Express reports for a dual-stack client', async () => {
    const { service } = makeService();

    expect((await service.resolve('::ffff:152.53.3.94')).protected).toBe(true);
  });

  it('still answers when the geo lookup fails, just without a country', async () => {
    const { service } = makeService({ country: null });

    expect(await service.resolve('81.84.17.141')).toEqual({
      ip: '81.84.17.141',
      countryCode: null,
      city: 'Lisbon',
      isp: 'Test ISP',
      latitude: 38.7223,
      longitude: -9.1393,
      protected: false,
    });
  });

  it('fetches the node list once for repeated visitors', async () => {
    const { service, request } = makeService();

    await service.resolve('152.53.3.94');
    await service.resolve('65.108.214.39');

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('refreshes the node list once the cache has expired', async () => {
    vi.useFakeTimers();
    const { service, request } = makeService();

    await service.resolve('152.53.3.94');
    vi.advanceTimersByTime(NODE_CACHE_TTL_MS + 1);
    await service.resolve('152.53.3.94');

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps answering from the last known node list when the panel goes down', async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockResolvedValueOnce(NODES).mockRejectedValue(new Error('panel down'));
    const service = new IpStatusService(
      { request } as unknown as RemnaPanelClient,
      {
        lookup: vi.fn(async () => ({
          countryCode: 'PT',
          city: 'Lisbon',
          isp: 'Test ISP',
          latitude: 38.7223,
          longitude: -9.1393,
        })),
      } as unknown as GeoLookup,
    );

    await service.resolve('152.53.3.94');
    vi.advanceTimersByTime(NODE_CACHE_TTL_MS + 1);

    expect((await service.resolve('152.53.3.94')).protected).toBe(true);
  });

  it('says it does not know, rather than "not protected", when it has never reached the panel', async () => {
    const { service } = makeService({ panelFails: true });

    expect(await service.resolve('152.53.3.94')).toEqual({
      ip: '152.53.3.94',
      countryCode: 'PT',
      city: 'Lisbon',
      isp: 'Test ISP',
      latitude: 38.7223,
      longitude: -9.1393,
      protected: null,
    });
  });

  it('reports an unreadable client address as unknown without calling out', async () => {
    const { service, request, lookup } = makeService();

    expect(await service.resolve('')).toEqual({
      ip: null,
      countryCode: null,
      city: null,
      isp: null,
      latitude: null,
      longitude: null,
      protected: null,
    });
    expect(request).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });
});
