import type { FxRate } from '@workspace/database';
import { describe, expect, it, vi } from 'vitest';
import { FxRateService, type RateSource } from './fx-rate.service';

const HOUR = 60 * 60 * 1000;

function source(name: string, rate: number | Error): RateSource {
  return {
    name,
    fetchRate: vi.fn(() =>
      rate instanceof Error ? Promise.reject(rate) : Promise.resolve({ rate, asOf: new Date() }),
    ),
  };
}

function makeRepo(lastGood: FxRate | null = null) {
  return {
    findOneBy: vi.fn().mockResolvedValue(lastGood),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

function setup(opts: { sources: RateSource[]; lastGood?: FxRate | null; now?: () => number }) {
  const repo = makeRepo(opts.lastGood ?? null);
  const service = new FxRateService(repo as never, opts.sources, opts.now ?? Date.now);
  return { service, repo };
}

function lastGoodRow(overrides: Partial<FxRate> = {}): FxRate {
  return {
    pair: 'EUR_RUB',
    rate: '90.00000000',
    source: 'cbr-xml-daily',
    fetchedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as FxRate;
}

describe('FxRateService.getEurRubRate', () => {
  it('returns the rate from the primary source', async () => {
    const { service } = setup({ sources: [source('primary', 95.1834)] });
    expect(await service.getEurRubRate()).toBe(95.1834);
  });

  it('persists a freshly fetched rate as the last-good fallback', async () => {
    const { service, repo } = setup({ sources: [source('primary', 95.1834)] });
    await service.getEurRubRate();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ pair: 'EUR_RUB', rate: '95.1834', source: 'primary' }),
    );
  });

  it('falls back to the next source when the primary fails', async () => {
    const primary = source('primary', new Error('ETIMEDOUT'));
    const { service } = setup({ sources: [primary, source('fallback', 95.35)] });
    expect(await service.getEurRubRate()).toBe(95.35);
    expect(primary.fetchRate).toHaveBeenCalled();
  });

  it('does not call the fallback when the primary succeeds', async () => {
    const fallback = source('fallback', 95.35);
    const { service } = setup({ sources: [source('primary', 95.1834), fallback] });
    await service.getEurRubRate();
    expect(fallback.fetchRate).not.toHaveBeenCalled();
  });

  it('serves the cached rate without re-fetching inside the TTL', async () => {
    const primary = source('primary', 95.1834);
    const { service } = setup({ sources: [primary] });
    await service.getEurRubRate();
    await service.getEurRubRate();
    expect(primary.fetchRate).toHaveBeenCalledTimes(1);
  });

  it('re-fetches once the cache TTL has elapsed', async () => {
    const primary = source('primary', 95.1834);
    let now = 1_000_000;
    const { service } = setup({ sources: [primary], now: () => now });
    await service.getEurRubRate();
    now += 13 * HOUR;
    await service.getEurRubRate();
    expect(primary.fetchRate).toHaveBeenCalledTimes(2);
  });

  it('falls back to the persisted last-good rate when every source fails', async () => {
    const { service } = setup({
      sources: [source('primary', new Error('down')), source('fallback', new Error('down'))],
      lastGood: lastGoodRow({ rate: '93.5' }),
    });
    expect(await service.getEurRubRate()).toBe(93.5);
  });

  it('returns null when every source fails and nothing was ever persisted', async () => {
    const { service } = setup({
      sources: [source('primary', new Error('down'))],
      lastGood: null,
    });
    expect(await service.getEurRubRate()).toBeNull();
  });

  it('never throws when a source rejects — a webhook must not fail on FX', async () => {
    const { service } = setup({ sources: [source('primary', new Error('boom'))] });
    await expect(service.getEurRubRate()).resolves.toBeNull();
  });

  it('ignores a source that resolves a non-positive rate', async () => {
    const { service } = setup({ sources: [source('bad', 0), source('good', 95.1834)] });
    expect(await service.getEurRubRate()).toBe(95.1834);
  });
});

describe('FxRateService.convertRubToEurCents', () => {
  it('converts roubles to euro cents at the fetched rate', async () => {
    const { service } = setup({ sources: [source('primary', 95.1834)] });
    // 599 RUB / 95.1834 = 6.2931... EUR -> 629 cents
    expect(await service.convertRubToEurCents(599)).toBe(629);
  });

  it('rounds to the nearest cent rather than truncating', async () => {
    const { service } = setup({ sources: [source('primary', 100)] });
    // 10.005 RUB / 100 = 0.10005 EUR -> 10 cents; 10.006 -> 10.006/100 = 0.10006 -> 10
    expect(await service.convertRubToEurCents(1.005)).toBe(1);
    expect(await service.convertRubToEurCents(1.006)).toBe(1);
    expect(await service.convertRubToEurCents(1.5)).toBe(2);
    expect(await service.convertRubToEurCents(200)).toBe(200);
    expect(await service.convertRubToEurCents(281.1)).toBe(281);
  });

  it('returns null when no rate can be resolved, so callers can skip reporting', async () => {
    const { service } = setup({ sources: [source('primary', new Error('down'))] });
    expect(await service.convertRubToEurCents(599)).toBeNull();
  });

  it('rejects a non-positive amount', async () => {
    const { service } = setup({ sources: [source('primary', 95.1834)] });
    expect(await service.convertRubToEurCents(0)).toBeNull();
    expect(await service.convertRubToEurCents(-100)).toBeNull();
  });
});
