import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readCookie, readJsonCookie, removeCookie, writeCookie, writeJsonCookie } from './cookies';

function clearCookies() {
  for (const cookie of document.cookie.split('; ')) {
    const name = cookie.split('=')[0];
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

beforeEach(clearCookies);
afterEach(clearCookies);

describe('readCookie / writeCookie', () => {
  it('round-trips a value', () => {
    writeCookie('jv_test', 'hello');
    expect(readCookie('jv_test')).toBe('hello');
  });

  it('returns null when the cookie is absent', () => {
    expect(readCookie('jv_missing')).toBeNull();
  });

  it('preserves a value containing separators, which naive parsers truncate', () => {
    writeCookie('jv_test', 'a=b; c=d');
    expect(readCookie('jv_test')).toBe('a=b; c=d');
  });

  it('does not confuse a cookie whose name is a suffix of another', () => {
    writeCookie('jv_referral', 'inviter');
    writeCookie('referral', 'other');
    expect(readCookie('referral')).toBe('other');
    expect(readCookie('jv_referral')).toBe('inviter');
  });
});

describe('readJsonCookie / writeJsonCookie', () => {
  it('round-trips an object', () => {
    writeJsonCookie('jv_obj', { partner_id: 'part_1', click_id: 'clk_1' });
    expect(readJsonCookie('jv_obj')).toEqual({ partner_id: 'part_1', click_id: 'clk_1' });
  });

  it('round-trips a bare string, which JSON quotes', () => {
    writeJsonCookie('jv_str', 'zaira');
    expect(readJsonCookie<string>('jv_str')).toBe('zaira');
  });

  it('returns null rather than throwing on a value that is not JSON', () => {
    document.cookie = 'jv_bad=not-json';
    expect(readJsonCookie('jv_bad')).toBeNull();
  });

  it('returns null when absent', () => {
    expect(readJsonCookie('jv_missing')).toBeNull();
  });
});

describe('removeCookie', () => {
  it('deletes a stored value', () => {
    writeCookie('jv_test', 'hello');
    removeCookie('jv_test');
    expect(readCookie('jv_test')).toBeNull();
  });

  it('is harmless when the cookie was never set', () => {
    expect(() => removeCookie('jv_missing')).not.toThrow();
  });
});
