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
/** Languages a global host may serve. Arabic has no domain of its own, but stays selectable. */
const GLOBAL: readonly string[] = ['en', 'ar'];

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
    en: import.meta.env.PUBLIC_DOMAIN_EU,
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
