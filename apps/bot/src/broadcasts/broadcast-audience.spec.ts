import { UserDto } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIENCE,
  filterUsersByAudience,
  isBroadcastAudience,
  parseAudience,
} from './broadcast-audience';

const user = (overrides: Partial<UserDto>): UserDto => ({ ...overrides } as UserDto);

const active = user({ telegramId: 1, status: 'ACTIVE' });
const expired = user({ telegramId: 2, status: 'EXPIRED' });
const limited = user({ telegramId: 3, status: 'LIMITED' });

describe('isBroadcastAudience', () => {
  it('recognises known segments', () => {
    expect(isBroadcastAudience('all')).toBe(true);
    expect(isBroadcastAudience('expired')).toBe(true);
  });

  it('rejects unknown segments', () => {
    expect(isBroadcastAudience('active')).toBe(false);
    expect(isBroadcastAudience('')).toBe(false);
  });
});

describe('parseAudience', () => {
  it('returns the segment when valid', () => {
    expect(parseAudience('expired')).toBe('expired');
    expect(parseAudience('all')).toBe('all');
  });

  it('falls back to the default for missing or unknown tokens', () => {
    expect(parseAudience(undefined)).toBe(DEFAULT_AUDIENCE);
    expect(parseAudience('')).toBe(DEFAULT_AUDIENCE);
    expect(parseAudience('nonsense')).toBe(DEFAULT_AUDIENCE);
  });

  it('uses "all" as the default audience', () => {
    expect(DEFAULT_AUDIENCE).toBe('all');
  });
});

describe('filterUsersByAudience', () => {
  const users = [active, expired, limited];

  it('returns everyone for "all"', () => {
    expect(filterUsersByAudience(users, 'all')).toEqual(users);
  });

  it('returns only expired users for "expired"', () => {
    expect(filterUsersByAudience(users, 'expired')).toEqual([expired]);
  });

  it('does not mutate the input array', () => {
    const input = [...users];
    filterUsersByAudience(input, 'expired');
    expect(input).toEqual(users);
  });

  it('returns an empty list when no user matches', () => {
    expect(filterUsersByAudience([active, limited], 'expired')).toEqual([]);
  });
});
