import { Injectable, Logger } from '@nestjs/common';
import { Environment, Paddle } from '@paddle/paddle-node-sdk';

/** The subscription statuses that count as "this customer is currently subscribed". */
const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const;

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
}
