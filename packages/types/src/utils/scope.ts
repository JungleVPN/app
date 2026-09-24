/** Lowercases a host, drops any port and strips a leading `www.`. */
export const normalizeHostname = (hostname: string): string => {
  const withoutPort = hostname.trim().toLowerCase().split(':', 1)[0] ?? '';
  return withoutPort.startsWith('www.') ? withoutPort.slice(4) : withoutPort;
};

/** Splits a comma-separated domain env value (PUBLIC_DOMAIN_RU, PUBLIC_DOMAIN_GLOBAL) into normalized hostnames. */
export const parseDomains = (value: string | undefined | null): readonly string[] =>
  (value ?? '')
    .split(',')
    .map(normalizeHostname)
    .filter((entry) => entry.length > 0);

/** The normalized host of an `Origin` header/URL, or null when there isn't a usable one. */
const hostnameFromOrigin = (origin: string | undefined | null): string | null => {
  if (!origin) return null;
  try {
    return normalizeHostname(new URL(origin).hostname) || null;
  } catch {
    return null;
  }
};

/**
 * True when a host is one of the configured RU domains (PUBLIC_DOMAIN_RU, comma-separated)
 * or carries the `ru` prefix convention used across the monorepo, e.g. `ru-web.development-env.uk`.
 */
const isRuHost = (host: string, ruDomains?: string | null): boolean => {
  if (parseDomains(ruDomains).includes(host)) return true;

  const prefix = host.split(/[-.]/, 1)[0] ?? '';
  return prefix === 'ru';
};

/**
 * Which storefront a request or a user belongs to. RU is the only carve-out: it gets `ru`
 * behavior (rouble pricing, YooKassa/Stars, forced Russian), and everything else —
 * production global, per-environment preview hosts, localhost — gets `global`.
 */
export type UserScope = 'ru' | 'global';

/**
 * The scope an Origin/hostname implies. This is the *signup-time* answer: it is how a
 * brand-new user's scope is decided, and it is the only signal available on anonymous
 * surfaces (pricing, checkout) where there is no user yet. For an existing user, read the
 * scope stored on the user instead — a request host says where they are browsing from,
 * not which storefront they bought from.
 *
 * `ruDomains` is the caller's PUBLIC_DOMAIN_RU value (`process.env.PUBLIC_DOMAIN_RU` on
 * the backend, `import.meta.env.PUBLIC_DOMAIN_RU` on the frontend) — this package stays
 * environment-agnostic and never reads env vars itself.
 */
export const scopeForOrigin = (
  origin: string | undefined | null,
  ruDomains?: string | null,
): UserScope => {
  const host = hostnameFromOrigin(origin);
  if (!host) return 'ru';

  return isRuHost(host, ruDomains) ? 'ru' : 'global';
};

/** The PUBLIC_DOMAIN_RU / PUBLIC_DOMAIN_GLOBAL values a caller was configured with. */
export interface ScopeDomains {
  readonly ru?: string | null;
  readonly global?: string | null;
}

/**
 * The one host to build a link to for a scope, or null when nothing is configured.
 *
 * The inverse direction of `scopeForOrigin`, and deliberately not its mirror: both domain
 * variables hold a comma-separated list — the RU storefront alone answers on four hosts —
 * so the raw value cannot be pasted into a URL. It produced
 * `https://jungle.community,thejungle.pro,…/profile/subscription`, which is not a link any
 * mail client will open. The first entry is the canonical host of that storefront.
 *
 * Falls back to the global host so a missing PUBLIC_DOMAIN_RU yields a reachable link
 * rather than none.
 */
export const scopeHost = (scope: UserScope, domains: ScopeDomains): string | null => {
  const preferred = scope === 'ru' ? domains.ru : domains.global;

  return parseDomains(preferred)[0] ?? parseDomains(domains.global)[0] ?? null;
};

type SquadRef = { readonly uuid?: string | null };

/** Any panel user shape — created, fetched or streamed — carries its internal squads. */
type SquadUser = { readonly activeInternalSquads: readonly SquadRef[] };

/** The storefront squad uuids a caller was configured with. */
export interface ScopeSquads {
  readonly ru: string;
  readonly global: string;
}

/**
 * The storefront a user's squads imply, or null when they imply none.
 *
 * Holding the RU squad is what makes someone an RU user, whatever else they hold:
 * extra squads grant extra node access and say nothing about where the user signed
 * up. Reading "RU only if confined to the RU squad" is how a paying RU customer who
 * had been given an admin or test squad was sent a link to the global storefront.
 *
 * Null is deliberate and means "do not guess". A user carrying neither storefront
 * squad — access-only, or none at all — has their storefront recorded nowhere, and a
 * guess that gets written down is indistinguishable from a fact afterwards. Callers
 * should leave such a user unstamped and surface them for a human to decide.
 *
 * Pass a user fetched from the panel or its user stream, never one off a webhook
 * payload: the panel ships `user.not_connected` and the HWID events with
 * `activeInternalSquads` empty.
 */
export const scopeFromSquads = (user: SquadUser | null, squads: ScopeSquads): UserScope | null => {
  if (!user) return null;

  const uuids = new Set(
    user.activeInternalSquads
      .map((squad) => squad?.uuid?.trim().toLowerCase())
      .filter((uuid): uuid is string => Boolean(uuid)),
  );

  if (uuids.has(squads.ru.trim().toLowerCase())) return 'ru';
  if (uuids.has(squads.global.trim().toLowerCase())) return 'global';

  return null;
};
