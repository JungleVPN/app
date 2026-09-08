/** Lowercases a host, drops any port and strips a leading `www.`. */
export const normalizeHostname = (hostname: string): string => {
  const withoutPort = hostname.trim().toLowerCase().split(':', 1)[0] ?? '';
  return withoutPort.startsWith('www.') ? withoutPort.slice(4) : withoutPort;
};

/** The normalized host of an `Origin` header, or null when there isn't a usable one. */
const hostnameFromOrigin = (origin: string | undefined | null): string | null => {
  if (!origin) return null;
  try {
    return normalizeHostname(new URL(origin).hostname) || null;
  } catch {
    return null;
  }
};

/**
 * True when a host is the configured RU domain (PUBLIC_DOMAIN_RU) or carries
 * the `ru` prefix convention used across the monorepo (see
 * `@workspace/core`'s `domain.ts`), e.g. `ru-web.development-env.uk`.
 */
const isRuHost = (host: string): boolean => {
  const ruHost = hostnameFromOrigin(`https://${process.env.PUBLIC_DOMAIN_RU}`);
  if (ruHost !== null && host === ruHost) return true;

  const prefix = host.split(/[-.]/, 1)[0] ?? '';
  return prefix === 'ru';
};

/**
 * True for any signup Origin that is not RU — the signal that decides which
 * squads a new user is dropped into, since RU is the only carve-out: it gets
 * the default internal squad, and everything else (production global,
 * per-environment preview hosts, localhost) gets the global internal +
 * external squad.
 */
export const isGlobalOrigin = (origin: string | undefined | null): boolean => {
  const host = hostnameFromOrigin(origin);
  if (!host) return false;

  return !isRuHost(host);
};
