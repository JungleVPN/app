import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

export type TelegramInitDataPayload = {
  telegramId: number;
  authDate: Date;
};

/**
 * Validates Telegram WebApp initData using the standard HMAC-SHA256 algorithm.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * The bot token stays server-side — clients only hold the signed initData issued
 * by Telegram, which cannot be forged without the token.
 */
export function parseTelegramInitData(
  raw: string,
  botToken: string,
  maxAgeSeconds = 3600,
): TelegramInitDataPayload {
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash) throw new UnauthorizedException('Missing hash in Telegram initData');

  const dataCheckPairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') dataCheckPairs.push(`${key}=${value}`);
  }
  dataCheckPairs.sort();
  const dataCheckString = dataCheckPairs.join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const a = Buffer.from(computedHash, 'utf8');
  const b = Buffer.from(hash, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException('Invalid Telegram initData signature');
  }

  const authDateRaw = params.get('auth_date');
  if (!authDateRaw) throw new UnauthorizedException('Missing auth_date in Telegram initData');

  const authDate = new Date(parseInt(authDateRaw, 10) * 1000);
  const ageSeconds = (Date.now() - authDate.getTime()) / 1000;
  if (ageSeconds > maxAgeSeconds) {
    throw new UnauthorizedException('Telegram initData has expired');
  }

  const userRaw = params.get('user');
  if (!userRaw) throw new UnauthorizedException('Missing user in Telegram initData');

  let user: { id: number };
  try {
    user = JSON.parse(userRaw) as { id: number };
  } catch {
    throw new UnauthorizedException('Malformed user in Telegram initData');
  }

  if (!user?.id) throw new UnauthorizedException('Missing user.id in Telegram initData');

  return { telegramId: user.id, authDate };
}
