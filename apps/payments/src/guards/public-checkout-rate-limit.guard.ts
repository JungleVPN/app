import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Default sliding window: ten minutes. */
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

/** Default calls allowed per client IP per window. */
const DEFAULT_MAX_PER_IP = 5;

/**
 * Default calls allowed per payer email per window. Lower than the per-IP
 * allowance: a genuine visitor retries their own address a couple of times at
 * most, while a flood aimed at one inbox spreads itself across many IPs.
 */
const DEFAULT_MAX_PER_EMAIL = 3;

/** The bucket unattributable callers share, so they cannot each get their own. */
const UNKNOWN_IP_KEY = 'ip:unknown';

/**
 * Throttles the anonymous public checkout route.
 *
 * That route is the only payments endpoint with no credential of any kind:
 * anyone who can reach the host can call it, and every call costs a Stripe API
 * round trip and — for an address Stripe has not seen — a customer record. Two
 * independent windows are counted because they stop different abuse: the per-IP
 * window stops one caller hammering the route with a fresh address each time,
 * and the per-email window stops a distributed flood aimed at one victim's
 * inbox.
 *
 * State is per-process and in memory. Payments runs as a single instance behind
 * the proxy, so that is the whole picture today; if it is ever scaled out, this
 * becomes a per-instance allowance and the counters belong in Redis. It is
 * deliberately not the only protection — the route also refuses an email that
 * already subscribes, and no longer creates an account before payment settles.
 *
 * Configuration (all optional):
 *   PUBLIC_CHECKOUT_WINDOW_MS     — window length in ms (default 600000)
 *   PUBLIC_CHECKOUT_MAX_PER_IP    — calls per client IP per window (default 5)
 *   PUBLIC_CHECKOUT_MAX_PER_EMAIL — calls per payer email per window (default 3)
 */
@Injectable()
export class PublicCheckoutRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(PublicCheckoutRateLimitGuard.name);

  /** Call timestamps per bucket key, oldest first. */
  private readonly calls = new Map<string, number[]>();

  constructor(private readonly configService: ConfigService) {}

  /** Buckets currently being tracked — the eviction check tests observe this. */
  get trackedCallerCount(): number {
    return this.calls.size;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      body?: { email?: unknown };
    }>();

    const now = Date.now();
    const windowMs = this.numberSetting('PUBLIC_CHECKOUT_WINDOW_MS', DEFAULT_WINDOW_MS);

    // Sweep first so an expired bucket is gone before it is counted, and so a
    // long-running process does not accumulate a key per caller forever.
    this.evictExpired(now - windowMs);

    const ipKey = request.ip ? `ip:${request.ip}` : UNKNOWN_IP_KEY;
    const email = typeof request.body?.email === 'string' ? request.body.email : '';
    const normalizedEmail = email.trim().toLowerCase();

    const limits: { key: string; max: number; describe: string }[] = [
      {
        key: ipKey,
        max: this.numberSetting('PUBLIC_CHECKOUT_MAX_PER_IP', DEFAULT_MAX_PER_IP),
        describe: ipKey,
      },
      // An absent or blank email is not a bucket: the handler rejects it as a
      // bad request anyway, and keying on '' would pool every malformed call
      // into one counter that then throttles unrelated callers.
      ...(normalizedEmail
        ? [
            {
              key: `email:${normalizedEmail}`,
              max: this.numberSetting('PUBLIC_CHECKOUT_MAX_PER_EMAIL', DEFAULT_MAX_PER_EMAIL),
              describe: `email ${normalizedEmail}`,
            },
          ]
        : []),
    ];

    // Check every limit before recording anything, so a call refused on the
    // second limit does not still spend the first one's allowance.
    for (const limit of limits) {
      if ((this.calls.get(limit.key)?.length ?? 0) >= limit.max) {
        this.logger.warn(`Public checkout throttled for ${limit.describe}`);
        throw new HttpException(
          'Too many checkout attempts. Please try again in a few minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    for (const limit of limits) {
      const seen = this.calls.get(limit.key) ?? [];
      seen.push(now);
      this.calls.set(limit.key, seen);
    }

    return true;
  }

  /** Drops calls older than the window, and any bucket left with none. */
  private evictExpired(cutoff: number): void {
    for (const [key, timestamps] of this.calls) {
      const live = timestamps.filter((at) => at > cutoff);
      if (live.length === 0) this.calls.delete(key);
      else this.calls.set(key, live);
    }
  }

  private numberSetting(key: string, fallback: number): number {
    const parsed = Number(this.configService.get<string>(key, String(fallback)));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
