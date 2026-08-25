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
  ar?: string;
}

/** Staging hosts encode their language as a leading label, e.g. `ar-stage-web.thejungle.pro`. */
const PREFIX_LOCALE: Record<string, string> = { ru: 'ru', eu: 'en', ar: 'ar' };

export function resolveLocaleForHost(
  hostname: string,
  domains: DomainLocales,
  fallback = 'en',
): string {
  const host = normalizeHostname(hostname);
  if (parseDomains(domains.ru).includes(host)) return 'ru';
  if (parseDomains(domains.en).includes(host)) return 'en';
  if (parseDomains(domains.ar).includes(host)) return 'ar';
  const prefix = host.split(/[-.]/, 1)[0] ?? '';
  return PREFIX_LOCALE[prefix] ?? fallback;
}

/** Reads the domain lists the app was built with. */
export function configuredDomains(): DomainLocales {
  return {
    ru: import.meta.env.PUBLIC_DOMAIN_RU,
    en: import.meta.env.PUBLIC_DOMAIN_EU,
    ar: import.meta.env.PUBLIC_DOMAIN_AR,
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
