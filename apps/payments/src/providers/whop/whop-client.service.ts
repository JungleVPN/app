import { Injectable, Logger } from '@nestjs/common';
import { WhopClient, WhopEnvironment } from '@whop/sdk';

/**
 * The membership statuses that count as "this customer is currently subscribed".
 * `canceling` is still live: it is an active membership set to end at period
 * end, which Paddle would report as `active` with a scheduled cancellation.
 */
const LIVE_MEMBERSHIP_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'canceling']);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function resolveEnvironment(): WhopEnvironment {
  const value = process.env.WHOP_ENVIRONMENT;
  if (value !== 'sandbox' && value !== 'production') {
    throw new Error(
      `WHOP_ENVIRONMENT must be set to "sandbox" or "production" (got: ${value ?? 'unset'}). ` +
        'This is never defaulted, so a misconfigured deploy fails loudly instead of silently billing the wrong Whop account.',
    );
  }
  return value === 'sandbox' ? WhopEnvironment.Sandbox : WhopEnvironment.Production;
}

@Injectable()
export class WhopClientService {
  readonly whop: WhopClient;
  /** The Whop account (`biz_...`) we sell from — every lookup is scoped to it. */
  readonly accountId: string;
  private readonly logger = new Logger(WhopClientService.name);

  constructor() {
    const token = requireEnv('WHOP_API_KEY');
    this.accountId = requireEnv('WHOP_ACCOUNT_ID');
    this.whop = new WhopClient({ token, environment: resolveEnvironment() });
  }

  /**
   * Whether `email` already has a live (active/trialing/canceling) Whop
   * membership — the duplicate-checkout guard for the public checkout route,
   * mirroring Paddle's `hasActiveSubscription`.
   *
   * Whop can't filter memberships by email, so this goes through the member
   * search, which matches an exact email only when the API key holds the
   * `member:email:read` scope.
   */
  async hasActiveSubscription(email: string): Promise<boolean> {
    const members = await this.whop.members.list({ account_id: this.accountId, query: email });
    const userIds = members.data.flatMap((member) => (member.user ? [member.user.id] : []));
    if (userIds.length === 0) return false;

    try {
      const results = await Promise.all(userIds.map((userId) => this.hasLiveMembership(userId)));
      return results.some(Boolean);
    } catch (error) {
      this.logger.error(`Error checking Whop memberships for ${email}`, error);
      throw error;
    }
  }

  private async hasLiveMembership(userId: string): Promise<boolean> {
    const memberships = await this.whop.memberships.list({
      account_id: this.accountId,
      user_id: userId,
    });
    for await (const membership of memberships) {
      if (LIVE_MEMBERSHIP_STATUSES.has(membership.status)) return true;
    }
    return false;
  }
}
