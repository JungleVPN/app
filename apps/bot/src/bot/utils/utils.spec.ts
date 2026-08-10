import { describe, expect, it } from 'vitest';
import { isValidUsername, toDateString } from './utils';

describe('Utils', () => {
  describe('isValidUsername', () => {
    it('should return true for valid usernames', () => {
      expect(isValidUsername('valid_user_123')).toBe(true);
      expect(isValidUsername('User-Name')).toBe(true);
      expect(isValidUsername('12345')).toBe(true);
    });

    it('should return false for invalid usernames', () => {
      expect(isValidUsername('User Name')).toBe(false);
      expect(isValidUsername('User@Name')).toBe(false);
      expect(isValidUsername('')).toBe(false);
      expect(isValidUsername(undefined)).toBe(false);
      expect(isValidUsername(null)).toBe(false);
    });
  });

  describe('toDateString', () => {
    it('should format date string correctly to Russian locale', () => {
      // Testing a fixed date. Note: behavior depends on system time zone if not strictly mocked,
      // but the util uses 'Europe/Moscow', so we expect Moscow time.
      const dateStr = new Date('2023-10-25T12:00:00Z');
      const result = toDateString(dateStr);
      // 12:00 UTC is 15:00 Moscow (UTC+3)
      expect(result).toMatch(/25\.10\.2023, 15:00/);
    });
  });
});
