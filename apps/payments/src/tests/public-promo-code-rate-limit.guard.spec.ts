/**
 * PublicPromoCodeRateLimitGuard.
 *
 * Every public call that names a promo code tells the caller whether that code
 * exists, so each one is a guess. This guard caps guesses per IP on every route
 * that answers them, with its own allowance so checking codes never uses up
 * the one a payer needs to start a checkout.
 */

import 'reflect-metadata';
import { HttpException } from '@nestjs/common';
import { PublicPromoCodeRateLimitGuard } from '@payments/guards/public-promo-code-rate-limit.guard';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contextFor = (ip: string, body: Record<string, unknown> = { promoCode: 'SPRING20' }) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ip, body }) }),
  }) as never;

const makeGuard = (config: Record<string, string> = {}) =>
  new PublicPromoCodeRateLimitGuard({
    get: vi.fn((key: string, fallback?: unknown) => config[key] ?? fallback),
  } as never);

const statusOf = (attempt: () => unknown) => {
  try {
    attempt();
  } catch (caught) {
    return (caught as HttpException).getStatus();
  }
  return null;
};

describe('PublicPromoCodeRateLimitGuard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows a caller right up to the per-IP limit of promo guesses', () => {
    const guard = makeGuard({ PUBLIC_PROMO_CODE_MAX_PER_IP: '3' });

    for (let attempt = 0; attempt < 3; attempt++) {
      expect(guard.canActivate(contextFor('1.2.3.4', { promoCode: `CODE${attempt}` }))).toBe(true);
    }
  });

  it('answers a guess past the per-IP limit with 429', () => {
    const guard = makeGuard({ PUBLIC_PROMO_CODE_MAX_PER_IP: '2' });
    guard.canActivate(contextFor('1.2.3.4'));
    guard.canActivate(contextFor('1.2.3.4'));

    expect(statusOf(() => guard.canActivate(contextFor('1.2.3.4')))).toBe(429);
  });

  it('allows ten guesses per IP when nothing is configured', () => {
    const guard = makeGuard();
    for (let attempt = 0; attempt < 10; attempt++) {
      guard.canActivate(contextFor('1.2.3.4'));
    }

    expect(statusOf(() => guard.canActivate(contextFor('1.2.3.4')))).toBe(429);
  });

  it('never counts a call that names no promo code, so a payer can retry a declined card freely', () => {
    const guard = makeGuard({ PUBLIC_PROMO_CODE_MAX_PER_IP: '1' });
    guard.canActivate(contextFor('1.2.3.4'));

    for (const body of [{}, { promoCode: '' }, { promoCode: '   ' }]) {
      expect(guard.canActivate(contextFor('1.2.3.4', body))).toBe(true);
    }
  });

  it('counts a promo code that is not a string, so malformed guesses are not free', () => {
    const guard = makeGuard({ PUBLIC_PROMO_CODE_MAX_PER_IP: '1' });
    guard.canActivate(contextFor('1.2.3.4', { promoCode: 123 }));

    expect(statusOf(() => guard.canActivate(contextFor('1.2.3.4')))).toBe(429);
  });

  it("does not let one caller's guesses block another caller", () => {
    const guard = makeGuard({ PUBLIC_PROMO_CODE_MAX_PER_IP: '1' });
    guard.canActivate(contextFor('1.2.3.4'));

    expect(guard.canActivate(contextFor('5.6.7.8'))).toBe(true);
  });

  it('lets a throttled caller back in once the window has passed', () => {
    const guard = makeGuard({
      PUBLIC_PROMO_CODE_MAX_PER_IP: '1',
      PUBLIC_PROMO_CODE_WINDOW_MS: '60000',
    });
    guard.canActivate(contextFor('1.2.3.4'));

    vi.advanceTimersByTime(60_001);

    expect(guard.canActivate(contextFor('1.2.3.4'))).toBe(true);
  });

  it('still throttles callers whose IP the proxy did not resolve, as one shared bucket', () => {
    const guard = makeGuard({ PUBLIC_PROMO_CODE_MAX_PER_IP: '1' });
    guard.canActivate(contextFor(''));

    expect(statusOf(() => guard.canActivate(contextFor('')))).toBe(429);
  });

  it('forgets callers whose guesses have all expired', () => {
    const guard = makeGuard({ PUBLIC_PROMO_CODE_WINDOW_MS: '60000' });
    guard.canActivate(contextFor('1.2.3.4'));

    vi.advanceTimersByTime(60_001);
    guard.canActivate(contextFor('5.6.7.8'));

    expect(guard.trackedCallerCount).toBe(1);
  });
});
