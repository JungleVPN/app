/**
 * `req.ip` / `@Ip()` picks the plan currency on GET /plans, enforces it at
 * Whop checkout, gates YooKassa webhooks by source address and keys the public
 * rate limits — so it must be an address the visitor cannot choose.
 *
 * In prod and staging exactly one proxy sits in front of this service: Caddy on
 * the host (api.jungle-vpn.com and stage.thejungle.pro resolve straight to it,
 * no CDN). Caddy keeps whatever X-Forwarded-For the visitor sent and appends the
 * peer address it saw, so only the right-most entry is trustworthy. The same
 * holds for ngrok in local dev, and for apps/webhook, which relays the header
 * Caddy gave it unchanged.
 */

import type { AddressInfo } from 'node:net';
import express from 'express';
import { describe, expect, it } from 'vitest';
import { trustReverseProxy } from '../trust-reverse-proxy';

async function resolveClientIp(
  headers: Record<string, string> = {},
  trustedHops?: string,
): Promise<string> {
  const app = express();
  trustReverseProxy(app, { trustedHops });
  app.get('/ip', (req, res) => {
    res.send(req.ip);
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/ip`, { headers });
    return await response.text();
  } finally {
    server.close();
  }
}

describe('client IP behind the reverse proxy', () => {
  it('is the address the proxy appended, not one the visitor put in front of it', async () => {
    const ip = await resolveClientIp({ 'x-forwarded-for': '5.255.255.5, 81.84.17.141' });

    expect(ip).toBe('81.84.17.141');
  });

  it('ignores every visitor-supplied hop, however many there are', async () => {
    const ip = await resolveClientIp({
      'x-forwarded-for': '185.71.76.1, 5.255.255.5, 81.84.17.141',
    });

    expect(ip).toBe('81.84.17.141');
  });

  it('is the forwarded address when the proxy is the only one to set the header', async () => {
    const ip = await resolveClientIp({ 'x-forwarded-for': '81.84.17.141' });

    expect(ip).toBe('81.84.17.141');
  });

  it('is the peer address when nothing forwarded the request', async () => {
    const ip = await resolveClientIp();

    expect(ip).toBe('127.0.0.1');
  });

  it('is the address the outermost trusted proxy saw when more hops are configured', async () => {
    const ip = await resolveClientIp(
      { 'x-forwarded-for': '185.71.76.1, 5.255.255.5, 81.84.17.141' },
      '2',
    );

    expect(ip).toBe('5.255.255.5');
  });

  it('trusts a single hop when configured to one', async () => {
    const ip = await resolveClientIp({ 'x-forwarded-for': '5.255.255.5, 81.84.17.141' }, '1');

    expect(ip).toBe('81.84.17.141');
  });

  it('trusts a single hop when the configured value is blank', async () => {
    const ip = await resolveClientIp({ 'x-forwarded-for': '5.255.255.5, 81.84.17.141' }, '');

    expect(ip).toBe('81.84.17.141');
  });

  it.each(['0', '-1', '1.5', 'abc', 'true', '2 hops'])(
    'refuses to start with %j trusted hops',
    (trustedHops) => {
      expect(() => trustReverseProxy(express(), { trustedHops })).toThrow(
        `TRUSTED_PROXY_HOPS must be a positive integer, got "${trustedHops}"`,
      );
    },
  );
});
