import { Injectable, Logger } from '@nestjs/common';
import {
  type CurrencyCode,
  Environment,
  Paddle,
  type PricingPreview,
} from '@paddle/paddle-node-sdk';

/** The subscription statuses that count as "this customer is currently subscribed". */
const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const;

/** Quote currency when the visitor's location can't be priced (see `getPricePreview`). */
const FALLBACK_CURRENCY: CurrencyCode = 'EUR';

/**
 * How long a single price preview may take before we stop waiting.
 *
 * The SDK gives us no way to bound this itself: `PaddleOptions` has no timeout
 * setting and it calls `fetch` without an `AbortSignal`, so a connection that
 * opens and then stalls — a degraded network, a VPN hop, a Paddle incident —
 * hangs for as long as the OS allows. Unbounded, that hang is served straight
 * through to the visitor as a gateway timeout on the pricing page, which must
 * always render. Three seconds is well past Paddle's normal response time.
 */
const PREVIEW_TIMEOUT_MS = 3_000;

/** Raised when a preview exceeded `PREVIEW_TIMEOUT_MS`, as opposed to being refused by Paddle. */
class PreviewTimeoutError extends Error {}

/**
 * Rejects with `PreviewTimeoutError` if `work` outlives `timeoutMs`.
 *
 * The underlying request is not actually cancelled — the SDK accepts no
 * abort signal — so it is left to finish into the void. That wastes one
 * socket; blocking the caller on it would waste the whole page.
 */
function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new PreviewTimeoutError(`Paddle price preview timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    // Never let a pending timer hold the process open on shutdown.
    timer.unref();
  });

  return Promise.race([work, expiry]).finally(() => clearTimeout(timer));
}

function resolveEnvironment(): Environment {
  const value = process.env.PADDLE_ENVIRONMENT;
  if (value !== 'sandbox' && value !== 'production') {
    throw new Error(
      `PADDLE_ENVIRONMENT must be set to "sandbox" or "production" (got: ${value ?? 'unset'}). ` +
        'This is never defaulted, so a misconfigured deploy fails loudly instead of silently billing the wrong Paddle account.',
    );
  }
  return value === 'sandbox' ? Environment.sandbox : Environment.production;
}

@Injectable()
export class PaddleClientService {
  readonly paddle: Paddle;
  private readonly logger = new Logger(PaddleClientService.name);

  constructor() {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      throw new Error('PADDLE_API_KEY is not configured');
    }
    this.paddle = new Paddle(apiKey, { environment: resolveEnvironment() });
  }

  /**
   * Whether `email` already has a live (active/trialing) Paddle subscription —
   * the duplicate-checkout guard for the public checkout route, mirroring
   * Stripe's `hasActiveSubscription`.
   */
  async hasActiveSubscription(email: string): Promise<boolean> {
    const customers = await this.paddle.customers.list({ email: [email] }).next();
    if (customers.length === 0) return false;

    try {
      const customerIds = customers.map((customer) => customer.id);
      const subscriptions = await this.paddle.subscriptions
        .list({ customerId: customerIds, status: [...LIVE_SUBSCRIPTION_STATUSES] })
        .next();
      return subscriptions.length > 0;
    } catch (error) {
      this.logger.error(`Error checking Paddle subscription for ${email}`, error);
      throw error;
    }
  }

  /** The id of `customerId`'s live (active/trialing) subscription, or null if it has none. */
  async findActiveSubscriptionId(customerId: string): Promise<string | null> {
    try {
      const subscriptions = await this.paddle.subscriptions
        .list({ customerId: [customerId], status: [...LIVE_SUBSCRIPTION_STATUSES] })
        .next();
      return subscriptions[0]?.id ?? null;
    } catch (error) {
      this.logger.error(`Error listing Paddle subscriptions for customer ${customerId}`, error);
      throw error;
    }
  }

  /**
   * A fresh Customer Portal overview URL, authenticated for `customerId` and
   * deep-scoped to `subscriptionId`. Sessions are short-lived and must never
   * be cached — mint one per request (mirrors Stripe's Billing Portal session).
   */
  async createPortalUrl(customerId: string, subscriptionId: string): Promise<string> {
    const session = await this.paddle.customerPortalSessions.create(customerId, [subscriptionId]);
    return session.urls.general.overview;
  }

  /**
   * Converted, display-ready prices for `items`, in the currency Paddle
   * resolves for `customerIpAddress` (its own geolocation, matching what the
   * visitor will be charged at checkout).
   *
   * Falls back to a fixed EUR quote — skipping the lookup entirely when there
   * is no IP to try — when Paddle *refuses* to price that location: an
   * embargoed or unsupported country, or a non-public IP such as in
   * local/test environments. That refusal is a fast API error, so retrying in
   * a fixed currency costs nothing and keeps a price on the page.
   *
   * A timeout is not retried. It means the network path to Paddle is stalled,
   * and a second call would only stall again — doubling the wait before the
   * caller can fall back to static pricing. Every attempt is bounded by
   * `PREVIEW_TIMEOUT_MS`, so this resolves or throws promptly either way.
   */
  async getPricePreview(
    items: { priceId: string; quantity: number }[],
    customerIpAddress: string | null,
  ): Promise<PricingPreview> {
    if (!customerIpAddress) {
      return this.previewInFallbackCurrency(items);
    }

    try {
      return await withTimeout(
        this.paddle.pricingPreview.preview({ items, customerIpAddress }),
        PREVIEW_TIMEOUT_MS,
      );
    } catch (error) {
      if (error instanceof PreviewTimeoutError) throw error;

      this.logger.warn(
        `Paddle price preview failed for IP ${customerIpAddress}, falling back to ${FALLBACK_CURRENCY}`,
        error,
      );
      return this.previewInFallbackCurrency(items);
    }
  }

  private previewInFallbackCurrency(
    items: { priceId: string; quantity: number }[],
  ): Promise<PricingPreview> {
    return withTimeout(
      this.paddle.pricingPreview.preview({ items, currencyCode: FALLBACK_CURRENCY }),
      PREVIEW_TIMEOUT_MS,
    );
  }
}
