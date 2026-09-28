import type { Express } from 'express';

/**
 * Exactly one hop — Caddy in prod/staging, ngrok in local dev. Each appends
 * the peer it saw to X-Forwarded-For, so `req.ip` becomes that right-most
 * entry. `true` would make it the left-most entry, which the visitor writes.
 */
const TRUSTED_PROXY_HOPS = 1;

export function trustReverseProxy(app: Pick<Express, 'set'>): void {
  app.set('trust proxy', TRUSTED_PROXY_HOPS);
}
