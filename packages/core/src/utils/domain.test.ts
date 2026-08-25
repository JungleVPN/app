import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isRuDomain,
  localePolicyForHost,
  normalizeHostname,
  parseDomains,
  resolveLocaleForHost,
} from './domain';

const domains = {
  ru: 'jungle.community,thejungle.pro,web.thejungle.pro',
  en: 'jungle-vpn.com',
  ar: 'ar-jungle-vpn.com',
};

describe('normalizeHostname', () => {
  it('lowercases, drops the port and strips a leading www so apex and www hosts match', () => {
    expect(normalizeHostname('WWW.TheJungle.pro:443')).toBe('thejungle.pro');
  });
});

describe('parseDomains', () => {
  it('reads a comma-separated list and ignores blank entries', () => {
    expect(parseDomains(' jungle.community , ,www.thejungle.pro ')).toEqual([
      'jungle.community',
      'thejungle.pro',
    ]);
  });

  it('treats an unset value as no domains', () => {
    expect(parseDomains(undefined)).toEqual([]);
  });
});

describe('resolveLocaleForHost', () => {
  it.each([
    'thejungle.pro',
    'www.thejungle.pro',
    'jungle.community',
    'web.thejungle.pro',
  ])('serves Russian on %s', (hostname) => {
    expect(resolveLocaleForHost(hostname, domains)).toBe('ru');
  });

  it('serves English on the global domain', () => {
    expect(resolveLocaleForHost('jungle-vpn.com', domains)).toBe('en');
  });

  it('serves Arabic on the Arabic domain', () => {
    expect(resolveLocaleForHost('ar-jungle-vpn.com', domains)).toBe('ar');
  });

  it('falls back to the language prefix for unlisted hosts', () => {
    expect(resolveLocaleForHost('ar-stage-web.thejungle.pro', domains)).toBe('ar');
  });

  it('falls back to English for hosts with no listing and no known prefix', () => {
    expect(resolveLocaleForHost('promo.thejungle.pro', domains)).toBe('en');
  });
});

describe('isRuDomain', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('is true for every configured Russian domain, including the www host', () => {
    vi.stubEnv('PUBLIC_DOMAIN_RU', domains.ru);
    vi.stubGlobal('window', { location: { hostname: 'www.thejungle.pro' } });
    expect(isRuDomain()).toBe(true);
  });

  it('is false on the global domain', () => {
    vi.stubEnv('PUBLIC_DOMAIN_RU', domains.ru);
    vi.stubGlobal('window', { location: { hostname: 'jungle-vpn.com' } });
    expect(isRuDomain()).toBe(false);
  });
});

describe('localePolicyForHost', () => {
  it.each([
    'thejungle.pro',
    'www.thejungle.pro',
    'jungle.community',
  ])('allows only Russian on %s', (hostname) => {
    expect(localePolicyForHost(hostname, domains)).toEqual(['ru']);
  });

  it.each([
    'jungle-vpn.com',
    'ar-jungle-vpn.com',
  ])('allows only the global languages on %s, so a ru-RU browser cannot force Russian', (hostname) => {
    expect(localePolicyForHost(hostname, domains)).toEqual(['en', 'ar']);
  });

  it('applies the Russian policy to prefix-matched staging hosts', () => {
    expect(localePolicyForHost('ru-stage-web.thejungle.pro', domains)).toEqual(['ru']);
  });

  it('applies the global policy to prefix-matched staging hosts', () => {
    expect(localePolicyForHost('ar-stage-web.thejungle.pro', domains)).toEqual(['en', 'ar']);
  });

  it.each([
    'app.thejungle.pro',
    'localhost',
  ])('leaves %s unrestricted, so the Mini App keeps every language', (hostname) => {
    expect(localePolicyForHost(hostname, domains)).toBeNull();
  });
});
