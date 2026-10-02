import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseTelegramInitData } from './telegram-init-data';

const BOT_TOKEN = 'test-bot-token-1234567890';

function makeInitData({ ageSeconds = 0, corruptHash = false } = {}): string {
  const authDate = Math.floor(Date.now() / 1000) - ageSeconds;
  const params = { auth_date: String(authDate), user: JSON.stringify({ id: 42 }) };
  const dataCheckString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = corruptHash
    ? 'a'.repeat(64)
    : createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...params, hash }).toString();
}

function rejectionOf(raw: string): UnauthorizedException {
  try {
    parseTelegramInitData(raw, BOT_TOKEN, 3600);
  } catch (error) {
    if (error instanceof UnauthorizedException) return error;
    throw error;
  }
  throw new Error('expected an UnauthorizedException');
}

describe('parseTelegramInitData', () => {
  it('marks expired initData with the init_data_expired code', () => {
    expect(rejectionOf(makeInitData({ ageSeconds: 7200 })).getResponse()).toMatchObject({
      code: 'init_data_expired',
    });
  });

  it('does not mark a bad signature as expired', () => {
    expect(rejectionOf(makeInitData({ corruptHash: true })).getResponse()).not.toMatchObject({
      code: 'init_data_expired',
    });
  });
});
