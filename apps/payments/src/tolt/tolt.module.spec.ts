import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { toltConfigFactory } from './tolt.module';

function configWith(values: Record<string, string | undefined>) {
  return { get: vi.fn((key: string) => values[key]) } as unknown as ConfigService;
}

const logger = () => ({ warn: vi.fn() });

describe('toltConfigFactory', () => {
  it('reads the api key from the environment', () => {
    const config = toltConfigFactory(configWith({ TOLT_API_KEY: 'sk_live_1' }), logger());
    expect(config.apiKey).toBe('sk_live_1');
  });

  it('defaults the base url when unset', () => {
    const config = toltConfigFactory(configWith({ TOLT_API_KEY: 'sk_live_1' }), logger());
    expect(config.baseUrl).toBe('https://api.tolt.com');
  });

  it('allows the base url to be overridden', () => {
    const config = toltConfigFactory(
      configWith({ TOLT_API_KEY: 'k', TOLT_API_BASE_URL: 'https://staging.tolt.test' }),
      logger(),
    );
    expect(config.baseUrl).toBe('https://staging.tolt.test');
  });

  it('falls back to the default when the base url is set but blank', () => {
    const config = toltConfigFactory(
      configWith({ TOLT_API_KEY: 'k', TOLT_API_BASE_URL: '' }),
      logger(),
    );
    expect(config.baseUrl).toBe('https://api.tolt.com');
  });

  it('boots without an api key rather than crashing the payments service', () => {
    const log = logger();
    const config = toltConfigFactory(configWith({}), log);

    expect(config.apiKey).toBe('');
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('TOLT_API_KEY'));
  });

  it('stays quiet when the key is present', () => {
    const log = logger();
    toltConfigFactory(configWith({ TOLT_API_KEY: 'sk_live_1' }), log);
    expect(log.warn).not.toHaveBeenCalled();
  });
});
