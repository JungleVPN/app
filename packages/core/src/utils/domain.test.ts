import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isCrawlablePath,
  isLandingPath,
  isRuDomain,
  localePolicyForHost,
  markdownPathFor,
  normalizeHostname,
  parseDomains,
  resolveLocaleForHost,
  resolveLocaleForRequest,
} from './domain';

const domains = {
  ru: 'jungle.community,thejungle.pro,web.thejungle.pro',
  en: 'jungle-vpn.com',
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

  it('falls back to the language prefix for unlisted hosts', () => {
    expect(resolveLocaleForHost('ru-stage-web.thejungle.pro', domains)).toBe('ru');
  });

  it('serves English on a host whose prefix is not a known language', () => {
    expect(resolveLocaleForHost('ar-stage-web.thejungle.pro', domains)).toBe('en');
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

  it('allows the global languages on jungle-vpn.com, so a ru-RU browser cannot force Russian', () => {
    expect(localePolicyForHost('jungle-vpn.com', domains)).toEqual(['en', 'ar', 'tr']);
  });

  it('applies the Russian policy to prefix-matched staging hosts', () => {
    expect(localePolicyForHost('ru-stage-web.thejungle.pro', domains)).toEqual(['ru']);
  });

  it('applies the global policy to prefix-matched staging hosts', () => {
    expect(localePolicyForHost('eu-stage-web.thejungle.pro', domains)).toEqual(['en', 'ar', 'tr']);
  });

  it.each([
    'app.thejungle.pro',
    'localhost',
  ])('leaves %s unrestricted, so the Mini App keeps every language', (hostname) => {
    expect(localePolicyForHost(hostname, domains)).toBeNull();
  });
});

describe('isLandingPath', () => {
  it.each(['/', '/en', '/ar', '/tr'])('is true for the landing path %s', (pathname) => {
    expect(isLandingPath(pathname)).toBe(true);
  });

  it.each(['/subscribe', '/en/nested', '/login'])('is false for %s', (pathname) => {
    expect(isLandingPath(pathname)).toBe(false);
  });
});

describe('isCrawlablePath', () => {
  it.each([
    '/',
    '/en',
    '/ar',
    '/tr',
    '/terms',
    '/privacy',
    '/affiliates',
    '/subscribe',
    '/login',
  ])('is true for the public path %s', (pathname) => {
    expect(isCrawlablePath(pathname)).toBe(true);
  });

  it.each([
    '/profile',
    '/profile/plans',
    '/login/confirm',
    '/subscription/abc123',
    '/en/nested',
  ])('is false for the authenticated or dynamic path %s', (pathname) => {
    expect(isCrawlablePath(pathname)).toBe(false);
  });
});

describe('markdownPathFor', () => {
  it('maps the root landing path to /index.md, the llms.txt convention', () => {
    expect(markdownPathFor('/')).toBe('/index.md');
  });

  it('appends .md to every other crawlable path', () => {
    expect(markdownPathFor('/terms')).toBe('/terms.md');
    expect(markdownPathFor('/en')).toBe('/en.md');
  });
});

describe('resolveLocaleForRequest', () => {
  it('serves English at the global domain root', () => {
    expect(resolveLocaleForRequest('jungle-vpn.com', '/', domains)).toBe('en');
  });

  it('serves English on the global domain /en path', () => {
    expect(resolveLocaleForRequest('jungle-vpn.com', '/en', domains)).toBe('en');
  });

  it('serves Arabic on the global domain /ar path', () => {
    expect(resolveLocaleForRequest('jungle-vpn.com', '/ar', domains)).toBe('ar');
  });

  it('serves Turkish on the global domain /tr path', () => {
    expect(resolveLocaleForRequest('jungle-vpn.com', '/tr', domains)).toBe('tr');
  });

  it('falls back to English on the global domain for an unknown path segment', () => {
    expect(resolveLocaleForRequest('jungle-vpn.com', '/subscribe', domains)).toBe('en');
  });

  it('ignores the path on the RU domain, which is always Russian', () => {
    expect(resolveLocaleForRequest('www.thejungle.pro', '/ar', domains)).toBe('ru');
  });

  it('applies /en and /ar path routing on unrestricted hosts too (e.g. localhost)', () => {
    expect(resolveLocaleForRequest('localhost', '/ar', domains)).toBe('ar');
    expect(resolveLocaleForRequest('localhost', '/en', domains)).toBe('en');
  });

  it('falls back to the hostname resolution on unrestricted hosts with no /en or /ar path', () => {
    expect(resolveLocaleForRequest('app.thejungle.pro', '/', domains)).toBe('en');
    expect(resolveLocaleForRequest('localhost', '/login', domains)).toBe('en');
  });

  it('only matches the exact /en and /ar landing paths, not a leading segment on a deeper route', () => {
    expect(resolveLocaleForRequest('jungle-vpn.com', '/ar/nested', domains)).toBe('en');
  });
});
