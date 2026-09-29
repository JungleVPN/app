import type { Express } from 'express';

/**
 * How many proxies sit in front of this service. Each appends the peer it saw
 * to X-Forwarded-For, so `req.ip` becomes the entry that many places from the
 * right. Anything further left was written by the visitor and is never trusted.
 *
 * Defaults to one hop — Caddy in prod/staging. Raise TRUSTED_PROXY_HOPS only
 * where the chain really is longer (e.g. local ngrok → apps/webhook).
 */
const DEFAULT_TRUSTED_PROXY_HOPS = 1;

type TrustReverseProxyOptions = {
  readonly trustedHops?: string;
};

const parseTrustedHops = (trustedHops: string | undefined): number => {
  if (trustedHops === undefined || trustedHops.trim() === '') return DEFAULT_TRUSTED_PROXY_HOPS;
  if (!/^\d+$/.test(trustedHops.trim()) || Number(trustedHops) < 1) {
    throw new Error(`TRUSTED_PROXY_HOPS must be a positive integer, got "${trustedHops}"`);
  }
  return Number(trustedHops);
};

export function trustReverseProxy(
  app: Pick<Express, 'set'>,
  { trustedHops }: TrustReverseProxyOptions = {},
): void {
  app.set('trust proxy', parseTrustedHops(trustedHops));
}
