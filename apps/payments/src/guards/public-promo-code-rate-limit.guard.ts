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

/** Default promo code guesses allowed per client IP per window. */
const DEFAULT_MAX_PER_IP = 10;

/** The bucket unattributable callers share, so they cannot each get their own. */
const UNKNOWN_IP_KEY = 'ip:unknown';

/**
 * Throttles promo code guesses on the anonymous public routes.
 *
 * Any public call naming a promo code answers whether that code exists — the
 * code check does so by design, and the card payment does so by refusing an
 * invalid code before charging — so each such call is a guess. Only calls that
 * carry a promo code are counted: a payer retrying a declined card with no code
 * is never throttled here.
 *
 * Kept apart from PublicCheckoutRateLimitGuard so checking codes never spends
 * the allowance a payer needs to start a checkout. Like that guard, state is
 * per-process and in memory.
 *
 * Configuration (all optional):
 *   PUBLIC_PROMO_CODE_WINDOW_MS  — window length in ms (default 600000)
 *   PUBLIC_PROMO_CODE_MAX_PER_IP — guesses per client IP per window (default 10)
 */
@Injectable()
export class PublicPromoCodeRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(PublicPromoCodeRateLimitGuard.name);

  /** Guess timestamps per client IP, oldest first. */
  private readonly calls = new Map<string, number[]>();

  constructor(private readonly configService: ConfigService) {}

  /** Callers currently being tracked — the eviction check tests observe this. */
  get trackedCallerCount(): number {
    return this.calls.size;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      body?: { promoCode?: unknown };
    }>();

    const promoCode = request.body?.promoCode;
    if (promoCode === undefined || promoCode === null) return true;
    if (typeof promoCode === 'string' && !promoCode.trim()) return true;

    const now = Date.now();
    this.evictExpired(now - this.numberSetting('PUBLIC_PROMO_CODE_WINDOW_MS', DEFAULT_WINDOW_MS));

    const key = request.ip ? `ip:${request.ip}` : UNKNOWN_IP_KEY;
    const seen = this.calls.get(key) ?? [];
    if (seen.length >= this.numberSetting('PUBLIC_PROMO_CODE_MAX_PER_IP', DEFAULT_MAX_PER_IP)) {
      this.logger.warn(`Promo code guesses throttled for ${key}`);
      throw new HttpException(
        'Too many promo code attempts. Please try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.calls.set(key, [...seen, now]);
    return true;
  }

  /** Drops guesses older than the window, and any caller left with none. */
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
