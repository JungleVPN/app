import { createHmac, createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { parseTelegramInitData } from '../auth/telegram-init-data';
import { parseSupabaseJwt } from '../auth/supabase-jwt';

const BOT_TOKEN = 'test-bot-token-1234567890';

// ES256 key pairs — generated once per test run, used across all JWT tests
const { privateKey: PRIVATE_KEY, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const PUBLIC_KEY_JWK = JSON.stringify(publicKey.export({ format: 'jwk' }));
const { privateKey: OTHER_PRIVATE_KEY } = generateKeyPairSync('ec', { namedCurve: 'P-256' });

// ── Test fixture builders ──────────────────────────────────────────────────

function makeInitData(
  telegramId: number,
  options: { ageSeconds?: number; corruptHash?: boolean } = {},
): string {
  const authDate = Math.floor(Date.now() / 1000) - (options.ageSeconds ?? 0);
  const user = JSON.stringify({ id: telegramId, first_name: 'Test', username: 'testuser' });

  const params: Record<string, string> = { auth_date: String(authDate), user };

  const dataCheckPairs = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  let hash = createHmac('sha256', secretKey).update(dataCheckPairs).digest('hex');
  if (options.corruptHash) hash = 'a'.repeat(hash.length);

  return new URLSearchParams({ ...params, hash }).toString();
}

function makeJwt(payload: Record<string, unknown>, key: KeyObject = PRIVATE_KEY): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signer = createSign('SHA256');
  signer.update(`${header}.${body}`);
  const sig = signer.sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${header}.${body}.${sig.toString('base64url')}`;
}

const futureExp = Math.floor(Date.now() / 1000) + 3600;
const pastExp = Math.floor(Date.now() / 1000) - 60;

// ── parseTelegramInitData ──────────────────────────────────────────────────

describe('parseTelegramInitData', () => {
  it('returns the telegramId from valid initData', () => {
    const raw = makeInitData(123456789);
    const result = parseTelegramInitData(raw, BOT_TOKEN);
    expect(result.telegramId).toBe(123456789);
  });

  it('returns an authDate from valid initData', () => {
    const raw = makeInitData(123456789);
    const result = parseTelegramInitData(raw, BOT_TOKEN);
    expect(result.authDate).toBeInstanceOf(Date);
  });

  it('throws UnauthorizedException when hash is corrupted', () => {
    const raw = makeInitData(123456789, { corruptHash: true });
    expect(() => parseTelegramInitData(raw, BOT_TOKEN)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when hash is missing', () => {
    const raw = 'auth_date=1700000000&user=%7B%22id%22%3A1%7D';
    expect(() => parseTelegramInitData(raw, BOT_TOKEN)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when bot token is wrong', () => {
    const raw = makeInitData(123456789);
    expect(() => parseTelegramInitData(raw, 'wrong-token')).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when initData exceeds maxAgeSeconds', () => {
    const raw = makeInitData(123456789, { ageSeconds: 7200 });
    expect(() => parseTelegramInitData(raw, BOT_TOKEN, 3600)).toThrow(UnauthorizedException);
  });

  it('accepts initData within maxAgeSeconds', () => {
    const raw = makeInitData(123456789, { ageSeconds: 1800 });
    expect(() => parseTelegramInitData(raw, BOT_TOKEN, 3600)).not.toThrow();
  });

  it('throws UnauthorizedException when user field is absent', () => {
    const authDate = Math.floor(Date.now() / 1000);
    const params = { auth_date: String(authDate) };
    const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = createHmac('sha256', secretKey)
      .update(`auth_date=${authDate}`)
      .digest('hex');
    const raw = new URLSearchParams({ ...params, hash }).toString();
    expect(() => parseTelegramInitData(raw, BOT_TOKEN)).toThrow(UnauthorizedException);
  });
});

// ── parseSupabaseJwt ───────────────────────────────────────────────────────

describe('parseSupabaseJwt', () => {
  it('returns email and sub from a valid JWT', () => {
    const token = makeJwt({ sub: 'supabase-uuid-1', email: 'user@example.com', exp: futureExp });
    const result = parseSupabaseJwt(token, PUBLIC_KEY_JWK);
    expect(result.email).toBe('user@example.com');
    expect(result.sub).toBe('supabase-uuid-1');
  });

  it('throws UnauthorizedException when signed with a different key', () => {
    const token = makeJwt({ sub: 'uuid', email: 'a@b.com', exp: futureExp }, OTHER_PRIVATE_KEY);
    expect(() => parseSupabaseJwt(token, PUBLIC_KEY_JWK)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is expired', () => {
    const token = makeJwt({ sub: 'uuid', email: 'a@b.com', exp: pastExp });
    expect(() => parseSupabaseJwt(token, PUBLIC_KEY_JWK)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when JWT has wrong number of parts', () => {
    expect(() => parseSupabaseJwt('only.two', PUBLIC_KEY_JWK)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when email claim is absent', () => {
    const token = makeJwt({ sub: 'uuid', exp: futureExp });
    expect(() => parseSupabaseJwt(token, PUBLIC_KEY_JWK)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when sub claim is absent', () => {
    const token = makeJwt({ email: 'a@b.com', exp: futureExp });
    expect(() => parseSupabaseJwt(token, PUBLIC_KEY_JWK)).toThrow(UnauthorizedException);
  });
});
