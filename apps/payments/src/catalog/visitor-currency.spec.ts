import 'reflect-metadata';
import type { Plan } from '@workspace/database';
import { apiRoutes } from '@workspace/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { currencyForCountry } from './country-currency';
import { PlanService } from './plan.service';
import { VisitorCountryClient } from './visitor-country.client';
import { VisitorCurrencyService } from './visitor-currency.service';

const mockAxiosGet = vi.fn();
vi.mock('axios', () => ({
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) },
}));

const plan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 'whop-30',
  type: 'recurring',
  billingPeriod: 30,
  basePrice: 3.99,
  provider: 'whop',
  currency: 'EUR',
  providerPriceId: 'plan_30',
  availableForPurchase: true,
  customData: {},
  ...overrides,
});

const resolverWith = (rows: Plan[], countryCode: string | null) => {
  const countryOf = vi.fn(async (_ip: string | null) => countryCode);
  const service = new VisitorCurrencyService(new PlanService({ find: async () => rows } as never), {
    countryOf,
  } as unknown as VisitorCountryClient);
  return { service, countryOf };
};

describe('currencyForCountry', () => {
  it.each([
    ['DE', 'EUR'],
    ['PT', 'EUR'],
    ['US', 'USD'],
    ['GB', 'GBP'],
    ['AE', 'AED'],
    ['IN', 'INR'],
    ['ID', 'IDR'],
    ['BR', 'BRL'],
    ['TR', 'TRY'],
    ['PK', 'PKR'],
  ])('prices %s in %s', (country, currency) => {
    expect(currencyForCountry(country)).toBe(currency);
  });

  it('reads a lowercase country code the same way', () => {
    expect(currencyForCountry('de')).toBe('EUR');
  });

  it('has no currency for an unmapped or unknown country', () => {
    expect(currencyForCountry('AQ')).toBeNull();
    expect(currencyForCountry(null)).toBeNull();
  });
});

describe('VisitorCurrencyService', () => {
  it('skips the lookup when the provider sells in one currency only', async () => {
    const { service, countryOf } = resolverWith([plan({ currency: 'USD' })], 'DE');

    await expect(service.resolve({ provider: 'whop', clientIp: '1.2.3.4' })).resolves.toEqual({
      currency: 'USD',
      countryCode: null,
    });
    expect(countryOf).not.toHaveBeenCalled();
  });

  it("uses the provider's default currency when it has nothing on sale", async () => {
    const { service } = resolverWith([], 'US');

    await expect(service.resolve({ provider: 'whop', clientIp: '1.2.3.4' })).resolves.toEqual({
      currency: 'EUR',
      countryCode: null,
    });
  });

  it("prices a visitor in their country's currency when the provider sells in it", async () => {
    const { service, countryOf } = resolverWith(
      [plan(), plan({ id: 'whop-usd', currency: 'USD' })],
      'US',
    );

    await expect(service.resolve({ provider: 'whop', clientIp: '8.8.8.8' })).resolves.toEqual({
      currency: 'USD',
      countryCode: 'US',
    });
    expect(countryOf).toHaveBeenCalledWith('8.8.8.8');
  });

  it("falls back to the provider's default currency when it does not sell the country's", async () => {
    const { service } = resolverWith([plan(), plan({ id: 'whop-usd', currency: 'USD' })], 'GB');

    await expect(service.resolve({ provider: 'whop', clientIp: '1.2.3.4' })).resolves.toEqual({
      currency: 'EUR',
      countryCode: 'GB',
    });
  });

  it("falls back to the provider's default currency when the country is unknown", async () => {
    const { service } = resolverWith([plan(), plan({ id: 'whop-usd', currency: 'USD' })], null);

    await expect(service.resolve({ provider: 'whop', clientIp: null })).resolves.toEqual({
      currency: 'EUR',
      countryCode: null,
    });
  });
});

describe('VisitorCountryClient', () => {
  afterEach(() => {
    mockAxiosGet.mockReset();
    vi.unstubAllEnvs();
  });

  it('asks the remnawave service for the country of the address, as an internal caller', async () => {
    vi.stubEnv('REMNAWAVE_URL', 'http://remnawave.test/remnawave');
    vi.stubEnv('INTER_SERVICE_SECRET', 'shh');
    mockAxiosGet.mockResolvedValue({ data: { countryCode: 'PT' } });

    await expect(new VisitorCountryClient().countryOf('81.84.17.141')).resolves.toBe('PT');
    expect(mockAxiosGet).toHaveBeenCalledWith(
      `http://remnawave.test/remnawave${apiRoutes.remnawave.ipStatusLookup}`,
      expect.objectContaining({
        params: { ip: '81.84.17.141' },
        headers: { 'x-service-secret': 'shh' },
      }),
    );
  });

  it('answers null when the remnawave service cannot tell', async () => {
    mockAxiosGet.mockResolvedValue({ data: { countryCode: null } });

    await expect(new VisitorCountryClient().countryOf('81.84.17.141')).resolves.toBeNull();
  });

  it('answers null when the remnawave answer carries no country at all', async () => {
    mockAxiosGet.mockResolvedValue({ data: {} });

    await expect(new VisitorCountryClient().countryOf('81.84.17.141')).resolves.toBeNull();
  });

  it('answers null rather than failing when the remnawave service is unreachable', async () => {
    mockAxiosGet.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(new VisitorCountryClient().countryOf('81.84.17.141')).resolves.toBeNull();
  });

  it('does not call out for a request with no address', async () => {
    await expect(new VisitorCountryClient().countryOf(null)).resolves.toBeNull();
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });
});

/**
 * A visitor's address is looked up when the plans are priced and again moments
 * later when they check out, so an answer is remembered for a while rather
 * than asked for twice.
 */
describe('VisitorCountryClient remembering answers', () => {
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  afterEach(() => {
    mockAxiosGet.mockReset();
    vi.useRealTimers();
  });

  const answering = (countryCode: string | null) =>
    mockAxiosGet.mockResolvedValue({ data: { countryCode } });

  it('asks for an address once while its answer is fresh', async () => {
    answering('PT');
    const client = new VisitorCountryClient();

    await client.countryOf('81.84.17.141');
    await expect(client.countryOf('81.84.17.141')).resolves.toBe('PT');

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('still uses the answer just before it is ten minutes old', async () => {
    vi.useFakeTimers();
    answering('PT');
    const client = new VisitorCountryClient();
    await client.countryOf('81.84.17.141');

    vi.advanceTimersByTime(TEN_MINUTES_MS - 1);
    await client.countryOf('81.84.17.141');

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('asks again once the answer is ten minutes old', async () => {
    vi.useFakeTimers();
    answering('PT');
    const client = new VisitorCountryClient();
    await client.countryOf('81.84.17.141');

    vi.advanceTimersByTime(TEN_MINUTES_MS);
    answering('ES');

    await expect(client.countryOf('81.84.17.141')).resolves.toBe('ES');
    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
  });

  it('asks separately for each address', async () => {
    answering('PT');
    const client = new VisitorCountryClient();

    await client.countryOf('81.84.17.141');
    await client.countryOf('8.8.8.8');

    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
  });

  it('remembers that the remnawave service could not tell', async () => {
    answering(null);
    const client = new VisitorCountryClient();

    await client.countryOf('81.84.17.141');
    await expect(client.countryOf('81.84.17.141')).resolves.toBeNull();

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('asks again after a failed lookup, rather than remembering the failure', async () => {
    mockAxiosGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    answering('PT');
    const client = new VisitorCountryClient();

    await client.countryOf('81.84.17.141');

    await expect(client.countryOf('81.84.17.141')).resolves.toBe('PT');
    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
  });

  it('forgets the oldest address once it remembers a thousand', async () => {
    answering('PT');
    const client = new VisitorCountryClient();
    const addresses = Array.from(
      { length: 1001 },
      (_, index) => `10.0.${index >> 8}.${index & 255}`,
    );
    for (const address of addresses) await client.countryOf(address);
    mockAxiosGet.mockClear();

    await client.countryOf(addresses[1] ?? '');
    expect(mockAxiosGet).not.toHaveBeenCalled();

    await client.countryOf(addresses[0] ?? '');
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('counts an address asked again as the newest, so it is not the one forgotten', async () => {
    vi.useFakeTimers();
    answering('PT');
    const client = new VisitorCountryClient();
    const addresses = Array.from(
      { length: 1000 },
      (_, index) => `10.0.${index >> 8}.${index & 255}`,
    );
    for (const address of addresses) await client.countryOf(address);
    vi.advanceTimersByTime(TEN_MINUTES_MS);
    await client.countryOf(addresses[0] ?? '');

    await client.countryOf('8.8.8.8');
    mockAxiosGet.mockClear();
    await client.countryOf(addresses[0] ?? '');

    expect(mockAxiosGet).not.toHaveBeenCalled();
  });
});
