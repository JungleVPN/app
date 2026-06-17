import { UserDto } from '@workspace/types';

/**
 * Target audience for a broadcast.
 *
 * Selecting WHO receives a broadcast is kept separate from the delivery logic
 * (see broadcasts.service.ts / broadcast.base.ts). To add a new segment, add a
 * key here and a predicate in `audienceFilters` - no changes to delivery code.
 */
export type BroadcastAudience = 'all' | 'expired';

export const DEFAULT_AUDIENCE: BroadcastAudience = 'all';

type AudienceFilter = (user: UserDto) => boolean;

/**
 * A predicate per audience. `expired` is derived from the user's subscription
 * status reported by Remnawave.
 */
const audienceFilters: Record<BroadcastAudience, AudienceFilter> = {
  all: () => true,
  expired: (user) => user.status === 'EXPIRED',
};

export function isBroadcastAudience(value: string): value is BroadcastAudience {
  return value in audienceFilters;
}

/**
 * Resolve an audience from a raw command token (e.g. the word after `/message`).
 * Falls back to the default ("all") when the token is missing or unknown, so
 * the existing "send to everyone" behaviour is preserved.
 */
export function parseAudience(value: string | undefined): BroadcastAudience {
  return value && isBroadcastAudience(value) ? value : DEFAULT_AUDIENCE;
}

export function filterUsersByAudience(
  users: UserDto[],
  audience: BroadcastAudience,
): UserDto[] {
  return users.filter(audienceFilters[audience]);
}
