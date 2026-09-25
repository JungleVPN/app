import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { describe, expect, it } from 'vitest';
import en from '../core/i18n/locales/en.json';
import { formatExpiryDate, getExpirationText } from './configParser';

dayjs.extend(relativeTime);

const t = (key: string) =>
  key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], en) as string;

describe('getExpirationText', () => {
  it('says unknown when there is no expiry date', () => {
    expect(getExpirationText({ expireAt: null, lang: 'en', t })).toBe(
      en.subscriptionPage.info.unknown,
    );
  });

  it('says indefinitely for the 2099 sentinel date', () => {
    expect(getExpirationText({ expireAt: '2099-01-01T00:00:00Z', lang: 'en', t })).toBe(
      en.subscriptionPage.info.indefinitely,
    );
  });

  it('prefixes a past date with the expired label', () => {
    const expireAt = dayjs().subtract(3, 'day').toISOString();
    expect(getExpirationText({ expireAt, lang: 'en', t })).toBe(
      `${en.subscriptionPage.info.expired} 3 days ago`,
    );
  });

  it('prefixes a future date with the expires-in label', () => {
    const expireAt = dayjs().add(3, 'day').add(1, 'hour').toISOString();
    expect(getExpirationText({ expireAt, lang: 'en', t })).toBe(
      `${en.subscriptionPage.info.expiresIn} in 3 days`,
    );
  });
});

describe('formatExpiryDate', () => {
  it('says indefinitely for the 2099 sentinel date', () => {
    expect(formatExpiryDate({ date: '2099-06-01T00:00:00Z', lang: 'en', t })).toBe(
      en.subscriptionPage.info.indefinitely,
    );
  });

  it('formats a regular date in the given language', () => {
    expect(formatExpiryDate({ date: '2026-03-05T12:00:00Z', lang: 'en', t })).toBe(
      '05 March, 2026',
    );
  });
});
