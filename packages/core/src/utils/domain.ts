import { normalizeHostname, parseDomains, scopeForOrigin, type UserScope } from '@workspace/types';
import { useAuthStore, usePlatformStore } from '../stores';

export { normalizeHostname, parseDomains };

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
const GLOBAL: readonly string[] = ['en', 'ar', 'tr', 'id', 'hi', 'pt', 'es', 'ur'];

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
 * The hostname of the request being server-rendered. SSR has no `window`, so without it
 * `isGlobalOrigin` fell back to RU on every host and the server rendered the RU-only
 * markup that the global client never renders — a hydration mismatch on the landing
 * page. Set per request by the SSR entry before rendering.
 */
let requestHostname: string | null = null;

export function setRequestHostname(hostname: string | null): void {
  requestHostname = hostname;
}

/**
 * The storefront this page is being served as: `ru` on the RU domains
 * (PUBLIC_DOMAIN_RU) and inside the Telegram Mini App, `global` everywhere else.
 *
 * The Mini App has no domain of its own to route on (see `localePolicyForHost`'s
 * "unrestricted host" case), and every Telegram signup is RU regardless of the
 * client-supplied Origin — see `apps/remnawave/src/user/user.service.ts`. Delegates
 * the actual decision to `scopeForOrigin` in `@workspace/types`, the single source of
 * truth shared with the backend. Used to force Russian and to switch pricing/payment
 * UI to RUB-only behavior.
 *
 * This is the scope of the *page*, not of the signed-in user: it is what an
 * unauthenticated visitor's storefront is decided from. A page rendering something
 * specific to the signed-in user should read the scope stored on that user instead —
 * a request host says where they are browsing from, not which storefront they bought
 * from.
 *
 * On the server the hostname comes from `setRequestHostname`, so SSR and the first
 * client render agree; with neither a window nor a request hostname it stays `ru`.
 */
export function currentScope(): UserScope {
  if (usePlatformStore.getState().platformType === 'telegram') return 'ru';

  const hostname = typeof window === 'undefined' ? requestHostname : window.location.hostname;
  if (!hostname) return 'ru';

  return scopeForOrigin(`https://${hostname}`, configuredDomains().ru);
}

/**
 * The scope a page should render for: the signed-in user's stored scope when we know
 * it, and the host's otherwise.
 *
 * Prefer this to `currentScope` anywhere the output is specific to the signed-in user
 * — pricing, payment methods, install instructions. The host a user is browsing from
 * says where they are, not which storefront they bought from: an RU customer who
 * opens the global domain is still an RU customer, and showing them global pricing is
 * the same bug as sending them a global "manage subscription" link.
 *
 * For an unauthenticated visitor there is no user to ask, and the host is the right
 * answer — it is what their scope will be decided from if they sign up.
 */
export function userScope(): UserScope {
  return useAuthStore.getState().userScope ?? currentScope();
}

/** Non-English global languages that route as `/<lang>`. English is the unprefixed `/`. */
const GLOBAL_PATH_LOCALES: readonly string[] = GLOBAL.filter((locale) => locale !== 'en');

/**
 * The landing-page paths that mirror a language in the URL: `/` and `/en` are
 * English, with dedicated paths for Arabic, Turkish, Indonesian, Hindi, Portuguese, Spanish and Urdu. Shared by SSR
 * locale resolution, the header's landing-page layout check, and the language switcher's URL sync — see
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

/** The standalone marketing pricing page. */
export const PRICING_PATH = '/pricing';

/** The public referrals page reached from the header's "What we offer" menu. */
export const REFERRALS_PATH = '/referrals';

/** The public server-locations page reached from the header's "What we offer" menu. */
export const LOCATIONS_PATH = '/locations';

/** The public explainer page answering "what is a VPN?". */
export const WHAT_IS_VPN_PATH = '/what-is-vpn';

/** The public connection-status tool reached from the header's Tools menu. */
export const MY_IP_PATH = '/my-ip';

/**
 * True for the public marketing surfaces — the landing pages, the pricing page,
 * the referrals page, the locations page and the "what is a VPN" explainer —
 * which share the same transparent, nav-carrying header.
 */
export function isMarketingPath(pathname: string): boolean {
  return isUnprefixedMarketingPath(splitLocalePrefix(pathname).path);
}

/** The marketing pages that also route under a language prefix, e.g. `/ar/pricing`. */
export const LOCALIZED_MARKETING_PATHS: readonly string[] = [
  PRICING_PATH,
  REFERRALS_PATH,
  LOCATIONS_PATH,
  WHAT_IS_VPN_PATH,
  MY_IP_PATH,
];

function isUnprefixedMarketingPath(pathname: string): boolean {
  return pathname === '/' || LOCALIZED_MARKETING_PATHS.includes(pathname);
}

/**
 * Splits a marketing path into its language prefix and the page underneath: `/ar/pricing`
 * is Arabic `/pricing`, `/ar` is Arabic `/`. Anything else has no language prefix.
 */
function splitLocalePrefix(pathname: string): { locale: string | null; path: string } {
  const [, segment = '', ...rest] = pathname.split('/');
  const path = `/${rest.join('/')}`;
  const isPathLocale = segment === 'en' || GLOBAL_PATH_LOCALES.includes(segment);
  if (isPathLocale && isUnprefixedMarketingPath(path)) return { locale: segment, path };
  return { locale: null, path: pathname };
}

/** The same marketing page in another language: `/ar/pricing` in Turkish is `/tr/pricing`. */
export function pathForLocale(pathname: string, locale: string): string {
  const { path } = splitLocalePrefix(pathname);
  return locale === 'en' ? path : localizePath(path, `/${locale}`);
}

/**
 * Carries the current page's language prefix over to a marketing link, so navigating
 * from `/ar` to the pricing page lands on `/ar/pricing` rather than dropping back to
 * English. Non-marketing paths and paths that already name a language are left alone.
 */
export function localizePath(to: string, currentPathname: string): string {
  const { locale } = splitLocalePrefix(currentPathname);
  if (!locale || !isUnprefixedMarketingPath(to)) return to;
  return to === '/' ? `/${locale}` : `/${locale}${to}`;
}

export function isProfilePath(pathname: string): boolean {
  return pathname.includes('/profile');
}

const PLAN_CHECKOUT_PATH =
  /^\/payment\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for the plan-selection/checkout paths `/plans` and `/payment/:planId`, where AuthButtons are hidden. */
export function isPlansOrPaymentPlanPath(pathname: string): boolean {
  return pathname === '/plans' || PLAN_CHECKOUT_PATH.test(pathname);
}

/**
 * Public, unauthenticated marketing/legal paths safe to expose as Markdown
 * alternates to AI crawlers and agents. Excludes `/profile/*` (authenticated),
 * `/login/confirm` and `/subscription/:shortUuid` (single-use / personal).
 */
export const CRAWLABLE_PATHS: ReadonlySet<string> = new Set([
  ...LANDING_PATHS,
  PRICING_PATH,
  WHAT_IS_VPN_PATH,
  MY_IP_PATH,
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
 * The language to render for a given host + path. A global-language landing or marketing
 * path (`/ar`, `/ar/pricing`) wins on the global domain and on any unrestricted host (Mini App,
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

  const { locale } = splitLocalePrefix(pathname);
  if (locale) return locale;

  return allowed?.[0] ?? resolveLocaleForHost(hostname, domains, fallback);
}
