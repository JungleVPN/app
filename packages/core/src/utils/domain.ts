/**
 * Which language a hostname is served in. The RU domains are Russian-only; every other
 * host falls back to the global languages (en, ar).
 */

/** Lowercases, drops any port and strips a leading `www.` so apex and www hosts resolve alike. */
export function normalizeHostname(hostname: string): string {
  const withoutPort = hostname.trim().toLowerCase().split(':', 1)[0] ?? '';
  return withoutPort.startsWith('www.') ? withoutPort.slice(4) : withoutPort;
}

/** Splits a comma-separated domain env value into normalized hostnames. */
export function parseDomains(value: string | undefined): readonly string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => normalizeHostname(entry))
    .filter((entry) => entry.length > 0);
}

export interface DomainLocales {
  ru?: string;
  en?: string;
}

const PREFIX_LOCALE: Record<string, string> = { ru: 'ru', eu: 'en' };

export function resolveLocaleForHost(
  hostname: string,
  domains: DomainLocales,
  fallback = 'en',
): string {
  const host = normalizeHostname(hostname);
  if (parseDomains(domains.ru).includes(host)) return 'ru';
  if (parseDomains(domains.en).includes(host)) return 'en';
  const prefix = host.split(/[-.]/, 1)[0] ?? '';
  return PREFIX_LOCALE[prefix] ?? fallback;
}

const RU_ONLY: readonly string[] = ['ru'];
/** Languages a global host may serve. None besides English has a domain of its own. */
const GLOBAL: readonly string[] = ['en', 'ar', 'tr'];

/**
 * The languages a host is allowed to serve, or `null` when the host is not one of the
 * configured landing domains (Mini App, previews, localhost) and may serve any language.
 *
 * Without this, browser detection runs unconstrained: a ru-RU browser on the global
 * domain resolves to Russian after hydration even though SSR rendered English.
 */
export function localePolicyForHost(
  hostname: string,
  domains: DomainLocales,
): readonly string[] | null {
  const host = normalizeHostname(hostname);
  if (parseDomains(domains.ru).includes(host)) return RU_ONLY;
  if (parseDomains(domains.en).includes(host)) return GLOBAL;

  const prefix = host.split(/[-.]/, 1)[0] ?? '';
  if (prefix === 'ru') return RU_ONLY;
  if (prefix === 'eu') return GLOBAL;
  return null;
}

/** Reads the domain lists the app was built with. */
export function configuredDomains(): DomainLocales {
  return {
    ru: import.meta.env.PUBLIC_DOMAIN_RU,
    en: import.meta.env.PUBLIC_DOMAIN_GLOBAL,
  };
}

/**
 * True when the app is being served from one of the RU domains (PUBLIC_DOMAIN_RU).
 * Used to force Russian and to switch pricing/payment UI to RUB-only behavior.
 */
export function isRuDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return resolveLocaleForHost(window.location.hostname, configuredDomains()) === 'ru';
}

/** Non-English global languages that route as `/<lang>`. English is the unprefixed `/`. */
const GLOBAL_PATH_LOCALES: readonly string[] = GLOBAL.filter((locale) => locale !== 'en');

/**
 * The landing-page paths that mirror a language in the URL: `/` and `/en` are
 * English, `/ar` is Arabic, `/tr` is Turkish. Shared by SSR locale resolution, the
 * header's landing-page layout check, and the language switcher's URL sync — see
 * resolveLocaleForRequest, Header.tsx, AuthButtons.tsx and LanguageSwitcher.tsx.
 */
export const LANDING_PATHS: ReadonlySet<string> = new Set([
  '/',
  '/en',
  ...GLOBAL_PATH_LOCALES.map((locale) => `/${locale}`),
]);

/** True for the exact paths in LANDING_PATHS. */
export function isLandingPath(pathname: string): boolean {
  return LANDING_PATHS.has(pathname);
}

/**
 * Public, unauthenticated marketing/legal paths safe to expose as Markdown
 * alternates to AI crawlers and agents. Excludes `/profile/*` (authenticated),
 * `/login/confirm` and `/subscription/:shortUuid` (single-use / personal).
 */
export const CRAWLABLE_PATHS: ReadonlySet<string> = new Set([
  ...LANDING_PATHS,
  '/terms',
  '/privacy',
  '/cookies',
  '/affiliates',
  '/subscribe',
  '/login',
]);

/** True for the exact paths in CRAWLABLE_PATHS. */
export function isCrawlablePath(pathname: string): boolean {
  return CRAWLABLE_PATHS.has(pathname);
}

/** The Markdown-alternate URL for a crawlable path, following the `/index.md` convention for `/`. */
export function markdownPathFor(pathname: string): string {
  return pathname === '/' ? '/index.md' : `${pathname}.md`;
}

/**
 * The language to render for a given host + path. An exact `/en`, `/ar` or `/tr`
 * landing path wins on the global domain and on any unrestricted host (Mini App,
 * previews, localhost during development); `/` and every other path fall back to
 * the host's normal resolution. RU-only hosts always render Russian, path or not.
 *
 * Used by SSR, which otherwise resolved language from the hostname alone and always
 * rendered English on jungle-vpn.com/ar even though the client-side i18n path
 * detector picked up Arabic after hydration.
 */
export function resolveLocaleForRequest(
  hostname: string,
  pathname: string,
  domains: DomainLocales,
  fallback = 'en',
): string {
  const allowed = localePolicyForHost(hostname, domains);
  if (allowed === RU_ONLY) return 'ru';

  const segment = pathname.slice(1);
  if (segment === 'en' || GLOBAL_PATH_LOCALES.includes(segment)) return segment;

  return allowed?.[0] ?? resolveLocaleForHost(hostname, domains, fallback);
}
