import {
  GLOBAL_LOCALES,
  isLandingPath,
  LANDING_PATHS,
  LOCALIZED_MARKETING_PATHS,
  pathForLocale,
} from './domain';

export type PageSeo = { title: string; description: string };

export type SitemapOptions = {
  /** RU domains serve no language-prefixed paths, so those URLs would 404 there. */
  ruOnly: boolean;
};

const BRAND = 'JungleVPN';
const SITE_ALTERNATE_NAME = 'Jungle VPN';

const LEGAL_PATHS: readonly string[] = ['/terms', '/privacy', '/cookies'];

const ENGLISH_PAGE_SEO: Readonly<Record<string, PageSeo>> = {
  '/pricing': {
    title: `VPN Pricing & Plans — ${BRAND}`,
    description: `Compare ${BRAND} plans and pick the one that fits. Unlimited traffic and one VPN for all your devices.`,
  },
  '/locations': {
    title: `VPN Server Locations Worldwide — ${BRAND}`,
    description: `${BRAND} servers are located all around the world. Use the internet as if you are in North or South America, Europe or Asia.`,
  },
  '/what-is-vpn': {
    title: `What Is a VPN? How It Works in Plain Language — ${BRAND}`,
    description:
      'A VPN builds an encrypted tunnel between your device and a server you trust. Learn what that means in practice and what a VPN protects.',
  },
  '/my-ip': {
    title: `What Is My IP Address? Check Your Connection — ${BRAND}`,
    description: `See the IP address and location websites see for you, and check whether your ${BRAND} connection is protecting you.`,
  },
  '/referrals': {
    title: `Referral Program: Free VPN for Inviting Friends — ${BRAND}`,
    description: `Invite friends to ${BRAND} and earn 30 days of subscription for every signup.`,
  },
  '/terms': {
    title: `Terms of Service — ${BRAND}`,
    description: `The terms that apply when you use ${BRAND}.`,
  },
  '/privacy': {
    title: `Privacy Policy — ${BRAND}`,
    description: `How ${BRAND} collects, uses and protects your personal data.`,
  },
  '/cookies': {
    title: `Cookie Policy — ${BRAND}`,
    description: `Which cookies ${BRAND} uses and how you can control them.`,
  },
  '/affiliates': {
    title: `Affiliate Program: Share & Earn — ${BRAND}`,
    description: `Join the ${BRAND} affiliate program and earn a commission on every referral.`,
  },
};

const baseEnglishPath = (pathname: string): string => pathForLocale(pathname, 'en');

/**
 * The title and description for a page, overriding the locale-wide default. Only English
 * has per-page copy for now; every other language keeps its locale default, and the
 * landing page always does.
 */
export function pageSeoFor(pathname: string, locale: string): PageSeo | null {
  if (locale !== 'en') return null;
  return ENGLISH_PAGE_SEO[baseEnglishPath(pathname)] ?? null;
}

/** Public pages that belong in search results: landings, marketing pages in every language, legal pages. */
export function isIndexablePath(pathname: string): boolean {
  if (isLandingPath(pathname)) return true;
  const base = baseEnglishPath(pathname);
  return LOCALIZED_MARKETING_PATHS.includes(base) || LEGAL_PATHS.includes(base);
}

/**
 * The absolute URL search engines should treat as this page's identity. `/en/pricing`
 * is the same page as `/pricing`, which is also what the hreflang English entry names.
 */
export function canonicalUrl(origin: string, pathname: string): string {
  const path = pathname.startsWith('/en/') ? pathname.slice('/en'.length) : pathname;
  return `${origin}${path}`;
}

export type AlternateLink = { hreflang: string; path: string };

/** The hreflang entries (every language plus x-default) for a page that exists in several languages. */
export function alternateLinksFor(pathname: string): AlternateLink[] {
  if (isLandingPath(pathname)) {
    return [
      ...GLOBAL_LOCALES.map((locale) => ({ hreflang: locale, path: `/${locale}` })),
      { hreflang: 'x-default', path: '/' },
    ];
  }

  const base = baseEnglishPath(pathname);
  if (!LOCALIZED_MARKETING_PATHS.includes(base)) return [];

  return [
    ...GLOBAL_LOCALES.map((locale) => ({ hreflang: locale, path: pathForLocale(base, locale) })),
    { hreflang: 'x-default', path: base },
  ];
}

function sitemapPaths({ ruOnly }: SitemapOptions): string[] {
  const marketing = ['/', ...LOCALIZED_MARKETING_PATHS, ...LEGAL_PATHS];
  if (ruOnly) return marketing;

  const prefixed = LOCALIZED_MARKETING_PATHS.flatMap((path) =>
    GLOBAL_LOCALES.filter((locale) => locale !== 'en').map((locale) => pathForLocale(path, locale)),
  );
  return [...LANDING_PATHS, ...LOCALIZED_MARKETING_PATHS, ...prefixed, ...LEGAL_PATHS];
}

/** Builds the /sitemap.xml body for a given origin. */
export function buildSitemap(origin: string, options: SitemapOptions): string {
  const entries = sitemapPaths(options).map((path) => {
    const alternates = options.ruOnly
      ? []
      : alternateLinksFor(path).map(
          ({ hreflang, path: alternatePath }) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${origin}${alternatePath}"/>`,
        );
    return ['  <url>', `    <loc>${origin}${path}</loc>`, ...alternates, '  </url>'].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

/** Builds the /robots.txt body for a given origin. */
export function buildRobotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /profile',
    'Disallow: /login/confirm',
    'Disallow: /subscription/',
    '',
    'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export type StructuredDataInput = { pathname: string; title: string };

/**
 * JSON-LD for a page, safe to inline in a `<script type="application/ld+json">`. The landing
 * pages declare the site and its organization; inner pages declare where they sit under home.
 */
export function buildStructuredData(
  origin: string,
  { pathname, title }: StructuredDataInput,
): string {
  const home = `${origin}/`;
  const graph = isLandingPath(pathname)
    ? [
        {
          '@type': 'WebSite',
          '@id': `${home}#website`,
          url: home,
          name: BRAND,
          alternateName: SITE_ALTERNATE_NAME,
        },
        {
          '@type': 'Organization',
          '@id': `${home}#organization`,
          url: home,
          name: BRAND,
          alternateName: SITE_ALTERNATE_NAME,
          logo: `${origin}/assets/Logo.svg`,
        },
      ]
    : [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: home },
            { '@type': 'ListItem', position: 2, name: title, item: canonicalUrl(origin, pathname) },
          ],
        },
      ];

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
    /</g,
    '\\u003c',
  );
}
