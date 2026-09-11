/**
 * PublicCheckoutRateLimitGuard.
 *
 * `POST /stripe/public-create-session` is the one payments route with no
 * credential of any kind: anyone who can reach the host can call it. Every call
 * costs a Stripe API round trip and, for a fresh address, a Stripe customer
 * record, so an unthrottled route is both a spam surface and a bill.
 *
 * Two independent windows, because they stop different abuse: per-IP stops one
 * caller hammering the route with a fresh address each time, per-email stops a
 * distributed flood aimed at one victim's inbox.
 */

import 'reflect-metadata';
import { HttpException } from '@nestjs/common';
import { PublicCheckoutRateLimitGuard } from '@payments/guards/public-checkout-rate-limit.guard';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contextFor = (ip: string, email?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ip, body: email ? { email } : {} }) }),
  }) as never;

const makeGuard = (config: Record<string, string> = {}) =>
  new PublicCheckoutRateLimitGuard({
    get: vi.fn((key: string, fallback?: unknown) => config[key] ?? fallback),
  } as never);

describe('PublicCheckoutRateLimitGuard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('lets a first-time caller through', () => {
    const guard = makeGuard();

    expect(guard.canActivate(contextFor('1.2.3.4', 'a@test.com'))).toBe(true);
  });

  it('allows a caller right up to the per-IP limit', () => {
    const guard = makeGuard({ PUBLIC_CHECKOUT_MAX_PER_IP: '3' });

    for (let attempt = 0; attempt < 3; attempt++) {
      expect(guard.canActivate(contextFor('1.2.3.4', `payer${attempt}@test.com`))).toBe(true);
    }
  });

  it('refuses the call past the per-IP limit, whatever email it names', () => {
    const guard = makeGuard({ PUBLIC_CHECKOUT_MAX_PER_IP: '3' });

    for (let attempt = 0; attempt < 3; attempt++) {
      guard.canActivate(contextFor('1.2.3.4', `payer${attempt}@test.com`));
    }

    expect(() => guard.canActivate(contextFor('1.2.3.4', 'fresh@test.com'))).toThrow(HttpException);
  });

  it('answers a throttled call with 429, so the page can say "try again shortly"', () => {
    const guard = makeGuard({ PUBLIC_CHECKOUT_MAX_PER_IP: '1' });
    guard.canActivate(contextFor('1.2.3.4', 'a@test.com'));

    const error = (() => {
      try {
        guard.canActivate(contextFor('1.2.3.4', 'b@test.com'));
      } catch (caught) {
        return caught as HttpException;
      }
    })();

    expect(error?.getStatus()).toBe(429);
  });

  it('refuses a flood aimed at one email even when every call comes from a new IP', () => {
    const guard = makeGuard({
      PUBLIC_CHECKOUT_MAX_PER_EMAIL: '2',
      PUBLIC_CHECKOUT_MAX_PER_IP: '50',
    });

    guard.canActivate(contextFor('1.0.0.1', 'victim@test.com'));
    guard.canActivate(contextFor('1.0.0.2', 'victim@test.com'));

    expect(() => guard.canActivate(contextFor('1.0.0.3', 'victim@test.com'))).toThrow(
      HttpException,
    );
  });

  it('treats an email as one identity regardless of case or padding', () => {
    const guard = makeGuard({
      PUBLIC_CHECKOUT_MAX_PER_EMAIL: '1',
      PUBLIC_CHECKOUT_MAX_PER_IP: '50',
    });

    guard.canActivate(contextFor('1.0.0.1', 'victim@test.com'));

    expect(() => guard.canActivate(contextFor('1.0.0.2', '  VICTIM@test.com '))).toThrow(
      HttpException,
    );
  });

  it("does not let one caller's spending block another caller", () => {
    const guard = makeGuard({ PUBLIC_CHECKOUT_MAX_PER_IP: '1' });
    guard.canActivate(contextFor('1.2.3.4', 'a@test.com'));

    expect(guard.canActivate(contextFor('5.6.7.8', 'b@test.com'))).toBe(true);
  });

  it('lets a throttled caller back in once the window has passed', () => {
    const guard = makeGuard({
      PUBLIC_CHECKOUT_MAX_PER_IP: '1',
      PUBLIC_CHECKOUT_WINDOW_MS: '60000',
    });
    guard.canActivate(contextFor('1.2.3.4', 'a@test.com'));

    vi.advanceTimersByTime(60_001);

    expect(guard.canActivate(contextFor('1.2.3.4', 'a@test.com'))).toBe(true);
  });

  it('still throttles a caller whose IP the proxy did not resolve', () => {
    // An unattributable caller must not get an unlimited allowance — they all
    // share one bucket rather than each getting their own.
    const guard = makeGuard({ PUBLIC_CHECKOUT_MAX_PER_IP: '1' });
    guard.canActivate(contextFor('', 'a@test.com'));

    expect(() => guard.canActivate(contextFor('', 'b@test.com'))).toThrow(HttpException);
  });

  it('forgets callers whose window has expired instead of growing without bound', () => {
    const guard = makeGuard({ PUBLIC_CHECKOUT_WINDOW_MS: '60000' });

    for (let caller = 0; caller < 50; caller++) {
      guard.canActivate(contextFor(`10.0.0.${caller}`, `payer${caller}@test.com`));
    }
    vi.advanceTimersByTime(60_001);
    guard.canActivate(contextFor('10.1.0.1', 'later@test.com'));

    // Only the last caller's two buckets (their IP and their email) survive.
    expect(guard.trackedCallerCount).toBe(2);
  });
});
