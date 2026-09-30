/**
 * The landing page's live server locations: one card per country, however
 * many servers the country has. The card reports how many servers there are,
 * whether the location is up, and the average memory and CPU load across its
 * servers. A location none of whose servers has reported its system yet gets
 * no meters rather than empty ones pretending to read zero.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { NodeStatDto } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { Stats } from './Stats';

// A stable object, as the real memoized `useRemnawaveApi` returns.
const { api, getNodeStats } = vi.hoisted(() => {
  const getNodeStats = vi.fn();
  return { api: { getNodeStats }, getNodeStats };
});

vi.mock('../../api', () => ({
  useRemnawaveApi: () => api,
}));

// The `ui` barrel also exports TgsSticker, whose lottie-web touches a canvas
// context at import time — something jsdom does not implement.
vi.mock('lottie-web', () => ({ default: {} }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      params?.count === undefined ? key : `${key} ${params.count}`,
    i18n: { language: 'en' },
  }),
}));

const GB = 1024 ** 3;

function node(overrides: Partial<NodeStatDto> = {}): NodeStatDto {
  return {
    name: 'AT_PRIMARY',
    isConnected: true,
    countryCode: 'AT',
    uptime: 86_400,
    memoryUsed: 5 * GB,
    memoryTotal: 8 * GB,
    cpuLoad: 0.45,
    ...overrides,
  };
}

const COUNTRIES = ['AT', 'DE', 'FI', 'NL', 'US', 'FR', 'PL', 'SE', 'NO', 'GR', 'PE', 'MX'];

async function renderWith(nodes: NodeStatDto[]) {
  getNodeStats.mockResolvedValue(nodes);
  render(<Stats />);
  await act(() => Promise.resolve());
}

const card = (country: string) =>
  screen
    .getAllByRole('listitem')
    .find((item) => within(item).queryByRole('heading', { name: country })) as HTMLElement;

const meterValue = (country: string, name: string) =>
  within(card(country)).getByRole('meter', { name }).getAttribute('aria-valuenow');

describe('Stats', () => {
  it('shows one card per country, however many servers it has', async () => {
    await renderWith([
      node(),
      node({ name: 'AT_FALLBACK' }),
      node({ name: 'DE_PRIMARY', countryCode: 'DE' }),
    ]);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(card('Austria')).toBeTruthy();
    expect(card('Germany')).toBeTruthy();
  });

  it('counts the servers in each country', async () => {
    await renderWith([
      node(),
      node({ name: 'AT_FALLBACK' }),
      node({ name: 'DE_PRIMARY', countryCode: 'DE' }),
    ]);

    expect(within(card('Austria')).getByText('landing.stats.servers 2')).toBeTruthy();
    expect(within(card('Germany')).getByText('landing.stats.servers 1')).toBeTruthy();
  });

  it('keeps server names off the page', async () => {
    await renderWith([node()]);

    expect(screen.queryByText('AT_PRIMARY')).toBeNull();
  });

  it('advertises the connection speed', async () => {
    await renderWith([node()]);

    expect(within(card('Austria')).getByText('landing.stats.speed')).toBeTruthy();
  });

  it('marks a country online while any of its servers is up', async () => {
    await renderWith([
      node({ isConnected: false }),
      node({ name: 'AT_FALLBACK' }),
      node({ name: 'FI_PRIMARY', countryCode: 'FI', isConnected: false }),
    ]);

    expect(within(card('Austria')).getByText('landing.stats.online')).toBeTruthy();
    expect(within(card('Finland')).getByText('landing.stats.offline')).toBeTruthy();
  });

  it('meters memory as the average share in use across the country', async () => {
    await renderWith([
      node({ memoryUsed: 2 * GB, memoryTotal: 8 * GB }),
      node({ name: 'AT_FALLBACK', memoryUsed: 3 * GB, memoryTotal: 4 * GB }),
    ]);

    expect(meterValue('Austria', 'landing.stats.memory')).toBe('50');
  });

  it('meters CPU as the average load across the country', async () => {
    await renderWith([node({ cpuLoad: 0.2 }), node({ name: 'AT_FALLBACK', cpuLoad: 0.6 })]);

    expect(meterValue('Austria', 'landing.stats.cpu')).toBe('40');
  });

  it('counts an overloaded server as fully loaded, not more', async () => {
    await renderWith([node({ cpuLoad: 3 }), node({ name: 'AT_FALLBACK', cpuLoad: 0 })]);

    expect(meterValue('Austria', 'landing.stats.cpu')).toBe('50');
  });

  it('averages only the servers that reported, rather than counting silence as idle', async () => {
    await renderWith([
      node({ cpuLoad: 0.8, memoryUsed: 6 * GB, memoryTotal: 8 * GB }),
      node({ name: 'AT_NEW', memoryUsed: null, memoryTotal: null, cpuLoad: null }),
    ]);

    expect(meterValue('Austria', 'landing.stats.cpu')).toBe('80');
    expect(meterValue('Austria', 'landing.stats.memory')).toBe('75');
  });

  it('shows no meters for a country none of whose servers has reported', async () => {
    await renderWith([node({ uptime: null, memoryUsed: null, memoryTotal: null, cpuLoad: null })]);

    expect(within(card('Austria')).queryByRole('meter')).toBeNull();
    expect(within(card('Austria')).getByText('landing.stats.noData')).toBeTruthy();
  });

  it('shows six countries in full until the visitor asks for all of them', async () => {
    await renderWith(COUNTRIES.map((countryCode) => node({ countryCode })));

    expect(screen.getAllByRole('listitem')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'landing.stats.seeAll' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.queryByRole('button', { name: 'landing.stats.seeAll' })).toBeNull();
  });

  it('collapses back to six countries once expanded', async () => {
    await renderWith(COUNTRIES.map((countryCode) => node({ countryCode })));

    fireEvent.click(screen.getByRole('button', { name: 'landing.stats.seeAll' }));
    fireEvent.click(screen.getByRole('button', { name: 'landing.stats.showLess' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'landing.stats.seeAll' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'landing.stats.showLess' })).toBeNull();
  });

  it('only teases the next row while collapsed, hidden from assistive technology', async () => {
    await renderWith(COUNTRIES.map((countryCode) => node({ countryCode })));

    expect(screen.queryByRole('heading', { name: 'Poland' })).toBeNull();
    expect(screen.getByText('Poland')).toBeTruthy();
  });

  it('offers expansion as soon as a seventh country appears', async () => {
    await renderWith(COUNTRIES.slice(0, 7).map((countryCode) => node({ countryCode })));

    expect(screen.getByRole('button', { name: 'landing.stats.seeAll' })).toBeTruthy();
  });

  it('offers no expansion when six countries fit', async () => {
    await renderWith(COUNTRIES.slice(0, 6).map((countryCode) => node({ countryCode })));

    expect(screen.queryByRole('button', { name: 'landing.stats.seeAll' })).toBeNull();
  });

  it('offers no expansion when many servers share a few countries', async () => {
    await renderWith(Array.from({ length: 12 }, (_, i) => node({ name: `AT_${i}` })));

    expect(screen.queryByRole('button', { name: 'landing.stats.seeAll' })).toBeNull();
  });

  it('shows placeholders, not cards, while loading', () => {
    getNodeStats.mockReturnValue(new Promise(() => {}));

    render(<Stats />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('list', { busy: true })).toBeTruthy();
  });

  it('renders nothing when the stats cannot be fetched', async () => {
    getNodeStats.mockRejectedValue(new Error('offline'));

    const { container } = render(<Stats />);
    await act(() => Promise.resolve());

    expect(container.innerHTML).toBe('');
  });
});
