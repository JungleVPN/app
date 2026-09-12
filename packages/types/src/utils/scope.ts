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
 * True for any signup Origin/hostname that is not RU — the single source of truth for
 * RU vs. global behavior across the monorepo (which squads a new user is dropped into,
 * pricing/payment currency, forced locale, …). RU is the only carve-out: it gets `ru`
 * behavior, and everything else (production global, per-environment preview hosts,
 * localhost) gets global behavior.
 *
 * `ruDomains` is the caller's PUBLIC_DOMAIN_RU value (`process.env.PUBLIC_DOMAIN_RU` on
 * the backend, `import.meta.env.PUBLIC_DOMAIN_RU` on the frontend) — this package stays
 * environment-agnostic and never reads env vars itself.
 */
export const isGlobalOrigin = (
  origin: string | undefined | null,
  ruDomains?: string | null,
): boolean => {
  const host = hostnameFromOrigin(origin);
  if (!host) return false;

  return !isRuHost(host, ruDomains);
};

type SquadRef = { readonly uuid?: string | null };

/** Any panel user shape — created, fetched or streamed — carries its internal squads. */
type SquadUser = { readonly activeInternalSquads: readonly SquadRef[] };

/**
 * True when a user belongs to the global storefront, judged by the internal squads
 * they hold — the durable record of where they signed up. Only a user confined to the
 * RU squad is an RU-storefront user: any additional squad means additional access, and
 * so does holding no squads at all.
 *
 * Use this, never `metadata.lang`, to pick a domain or storefront for a user:
 * `lang` is a display preference the user can change (a Russian-speaking browser on
 * the global domain stores `lang: "ru"`) and says nothing about where they signed up.
 *
 * Pass a user fetched from the panel, never one off a webhook payload: the panel ships
 * `user.not_connected` and the HWID events with `activeInternalSquads` empty.
 *
 * `ruSquadUuid` is the caller's `RU_INTERNAL_SQUAD` value, which every service must
 * have configured. This module is bundled for the browser as well as the backend, so
 * it never reads env vars itself — the caller supplies them.
 */
export const isGlobalSquadUser = (user: SquadUser | null, ruSquadUuid: string): boolean => {
  if (!user) return false;
  const uuids = user.activeInternalSquads
    .map((squad) => squad?.uuid?.trim().toLowerCase())
    .filter((uuid): uuid is string => Boolean(uuid));

  if (uuids.length === 0) return true;

  const ruUuid = ruSquadUuid.trim().toLowerCase();

  return !uuids.every((uuid) => uuid === ruUuid);
};
