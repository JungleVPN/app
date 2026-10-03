import { describe, expect, it } from 'vitest';
import {
  alternateLinksFor,
  buildRobotsTxt,
  buildSitemap,
  buildStructuredData,
  canonicalUrl,
  isIndexablePath,
  pageSeoFor,
} from './seo';

const ORIGIN = 'https://jungle-vpn.com';

const locsOf = (sitemap: string): string[] =>
  [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? '');

describe('pageSeoFor', () => {
  it('gives each English marketing page its own title and description', () => {
    const paths = ['/pricing', '/locations', '/what-is-vpn', '/my-ip', '/referrals'];
    const seo = paths.map((path) => pageSeoFor(path, 'en'));

    expect(seo.every((entry) => entry !== null)).toBe(true);
    expect(new Set(seo.map((entry) => entry?.title)).size).toBe(paths.length);
    expect(new Set(seo.map((entry) => entry?.description)).size).toBe(paths.length);
  });

  it('brands every page title with JungleVPN', () => {
    expect(pageSeoFor('/pricing', 'en')?.title).toContain('JungleVPN');
    expect(pageSeoFor('/terms', 'en')?.title).toContain('JungleVPN');
  });

  it('covers the legal and affiliate pages', () => {
    expect(pageSeoFor('/terms', 'en')?.title).toMatch(/terms/i);
    expect(pageSeoFor('/privacy', 'en')?.title).toMatch(/privacy/i);
    expect(pageSeoFor('/cookies', 'en')?.title).toMatch(/cookie/i);
    expect(pageSeoFor('/affiliates', 'en')?.title).toMatch(/affiliate/i);
  });

  it('resolves a language-prefixed English page to the same entry', () => {
    expect(pageSeoFor('/en/pricing', 'en')).toEqual(pageSeoFor('/pricing', 'en'));
  });

  it('leaves the landing page to the locale default', () => {
    expect(pageSeoFor('/', 'en')).toBeNull();
    expect(pageSeoFor('/en', 'en')).toBeNull();
  });

  it('only overrides English; other languages keep their locale default', () => {
    expect(pageSeoFor('/ar/pricing', 'ar')).toBeNull();
    expect(pageSeoFor('/pricing', 'ru')).toBeNull();
  });

  it('has no entry for unknown or private paths', () => {
    expect(pageSeoFor('/profile/devices', 'en')).toBeNull();
    expect(pageSeoFor('/nope', 'en')).toBeNull();
  });
});

describe('isIndexablePath', () => {
  it('accepts landings, localized marketing pages, legal pages and affiliates', () => {
    for (const path of [
      '/',
      '/en',
      '/ar',
      '/pricing',
      '/ar/pricing',
      '/terms',
      '/privacy',
      '/cookies',
    ]) {
      expect(isIndexablePath(path)).toBe(true);
    }
  });

  it('rejects authenticated, transactional and unknown paths', () => {
    for (const path of [
      '/profile',
      '/profile/devices',
      '/login',
      '/login/confirm',
      '/plans',
      '/payment/success',
      '/subscription/abc',
      '/nope',
    ]) {
      expect(isIndexablePath(path)).toBe(false);
    }
  });
});

describe('canonicalUrl', () => {
  it('is the absolute https URL of the page itself', () => {
    expect(canonicalUrl(ORIGIN, '/pricing')).toBe('https://jungle-vpn.com/pricing');
    expect(canonicalUrl(ORIGIN, '/ar/pricing')).toBe('https://jungle-vpn.com/ar/pricing');
    expect(canonicalUrl(ORIGIN, '/')).toBe('https://jungle-vpn.com/');
  });

  it('points /en/<page> at the unprefixed English page', () => {
    expect(canonicalUrl(ORIGIN, '/en/pricing')).toBe('https://jungle-vpn.com/pricing');
  });

  it('keeps the /en landing as its own page', () => {
    expect(canonicalUrl(ORIGIN, '/en')).toBe('https://jungle-vpn.com/en');
  });
});

describe('alternateLinksFor', () => {
  it('lists every language of a landing page, with / as x-default', () => {
    const links = alternateLinksFor('/ar');

    expect(links).toContainEqual({ hreflang: 'en', path: '/en' });
    expect(links).toContainEqual({ hreflang: 'ar', path: '/ar' });
    expect(links).toContainEqual({ hreflang: 'x-default', path: '/' });
    expect(links.map((link) => link.hreflang)).toHaveLength(9);
  });

  it('lists every language of a marketing page, with the unprefixed page as English and x-default', () => {
    const links = alternateLinksFor('/ar/pricing');

    expect(links).toContainEqual({ hreflang: 'en', path: '/pricing' });
    expect(links).toContainEqual({ hreflang: 'tr', path: '/tr/pricing' });
    expect(links).toContainEqual({ hreflang: 'x-default', path: '/pricing' });
    expect(links).toHaveLength(9);
  });

  it('has no alternates for pages that exist in one language only', () => {
    expect(alternateLinksFor('/terms')).toEqual([]);
    expect(alternateLinksFor('/affiliates')).toEqual([]);
  });
});

describe('buildSitemap', () => {
  it('is a sitemap with hreflang alternates declared', () => {
    const sitemap = buildSitemap(ORIGIN, { ruOnly: false });

    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    );
  });

  it('lists the marketing pages in every global language plus the legal pages', () => {
    const locs = locsOf(buildSitemap(ORIGIN, { ruOnly: false }));

    expect(locs).toContain('https://jungle-vpn.com/');
    expect(locs).toContain('https://jungle-vpn.com/pricing');
    expect(locs).toContain('https://jungle-vpn.com/ar/pricing');
    expect(locs).toContain('https://jungle-vpn.com/es/locations');
    expect(locs).toContain('https://jungle-vpn.com/terms');
    expect(locs).toContain('https://jungle-vpn.com/privacy');
    expect(locs).toContain('https://jungle-vpn.com/cookies');
  });

  it('lists every URL exactly once', () => {
    const locs = locsOf(buildSitemap(ORIGIN, { ruOnly: false }));

    expect(new Set(locs).size).toBe(locs.length);
  });

  it('does not list the /en/<page> duplicates of English pages', () => {
    const locs = locsOf(buildSitemap(ORIGIN, { ruOnly: false }));

    expect(locs).not.toContain('https://jungle-vpn.com/en/pricing');
  });

  it('never lists private or transactional pages', () => {
    const locs = locsOf(buildSitemap(ORIGIN, { ruOnly: false }));

    expect(locs.some((loc) => /profile|login|payment|plans|subscription/.test(loc))).toBe(false);
  });

  it('attaches hreflang alternates to localized pages', () => {
    const sitemap = buildSitemap(ORIGIN, { ruOnly: false });

    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="tr" href="https://jungle-vpn.com/tr/pricing"/>',
    );
    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://jungle-vpn.com/pricing"/>',
    );
  });

  it('lists only unprefixed pages on an RU-only host', () => {
    const sitemap = buildSitemap('https://thejungle.pro', { ruOnly: true });
    const locs = locsOf(sitemap);

    expect(locs).toContain('https://thejungle.pro/');
    expect(locs).toContain('https://thejungle.pro/pricing');
    expect(locs.some((loc) => /\/(en|ar|tr|id|hi|pt|es|ur)(\/|$)/.test(loc))).toBe(false);
    expect(sitemap).not.toContain('hreflang');
  });
});

describe('buildRobotsTxt', () => {
  it('points crawlers at the sitemap of the requesting host', () => {
    expect(buildRobotsTxt('https://thejungle.pro')).toContain(
      'Sitemap: https://thejungle.pro/sitemap.xml',
    );
  });

  it('keeps private areas disallowed', () => {
    const robots = buildRobotsTxt(ORIGIN);

    expect(robots).toContain('Disallow: /profile');
    expect(robots).toContain('Disallow: /login/confirm');
    expect(robots).toContain('Disallow: /subscription/');
  });
});

describe('buildStructuredData', () => {
  const parse = (json: string): { '@graph': Array<Record<string, unknown>> } => JSON.parse(json);

  it('describes the website and organization on the landing page', () => {
    const graph = parse(
      buildStructuredData(ORIGIN, { pathname: '/', title: 'JungleVPN — Fast & Secure VPN' }),
    )['@graph'];

    const website = graph.find((node) => node['@type'] === 'WebSite');
    const organization = graph.find((node) => node['@type'] === 'Organization');

    expect(website).toMatchObject({
      name: 'JungleVPN',
      alternateName: 'Jungle VPN',
      url: 'https://jungle-vpn.com/',
    });
    expect(organization).toMatchObject({
      name: 'JungleVPN',
      url: 'https://jungle-vpn.com/',
      logo: 'https://jungle-vpn.com/assets/Logo.svg',
    });
  });

  it('adds a breadcrumb trail to inner pages instead of repeating the organization', () => {
    const graph = parse(
      buildStructuredData(ORIGIN, { pathname: '/pricing', title: 'VPN Pricing — JungleVPN' }),
    )['@graph'];

    expect(graph.some((node) => node['@type'] === 'Organization')).toBe(false);
    expect(graph.find((node) => node['@type'] === 'BreadcrumbList')).toMatchObject({
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://jungle-vpn.com/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'VPN Pricing — JungleVPN',
          item: 'https://jungle-vpn.com/pricing',
        },
      ],
    });
  });

  it('escapes characters that could close the script tag', () => {
    const json = buildStructuredData(ORIGIN, { pathname: '/pricing', title: '</script><b>' });

    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toBeTruthy();
  });
});
