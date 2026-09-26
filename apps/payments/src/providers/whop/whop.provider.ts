import { Injectable } from '@nestjs/common';
import { PlanService } from '@payments/catalog/plan.service';
import type { WhopCheckoutPayload } from '@workspace/types';
import { WhopClientService } from './whop-client.service';
import { WhopWebhookService } from './whop-webhook.service';

@Injectable()
export class WhopProvider {
  constructor(
    private readonly whopClientService: WhopClientService,
    private readonly whopWebhookService: WhopWebhookService,
    private readonly planService: PlanService,
  ) {}

  /** Takes the signature-verified webhook body; the webhook service validates its shape. */
  async handleWebhook(event: unknown): Promise<void> {
    await this.whopWebhookService.handleWebhook(event);
  }

  async hasActiveSubscription(email: string): Promise<boolean> {
    return this.whopClientService.hasActiveSubscription(email);
  }

  /**
   * The Whop plan (`plan_...`) to bill for our `planId`, refusing a plan that
   * is not on sale. Kept apart from `createCheckout` so a request can be
   * rejected before anything is created on Whop.
   */
  async resolveCheckoutPlanId(planId: string): Promise<string> {
    const plan = await this.planService.getForCheckout(planId, 'whop');
    if (!plan.providerPriceId) {
      throw new Error('No Whop plan id was found in resolveCheckoutPlanId');
    }
    return plan.providerPriceId;
  }

  /**
   * Creates the checkout configuration for the public pricing page, stamped
   * with the metadata a later webhook needs to identify the payer once the
   * checkout settles
   */
  async createCheckout(input: {
    email: string;
    whopPlanId: string;
    toltReferralId?: string | null;
    inviterId?: number;
    origin?: string;
  }): Promise<WhopCheckoutPayload> {
    const metadata: Record<string, string> = { email: input.email };
    if (input.toltReferralId) metadata.toltReferralId = input.toltReferralId;
    if (input.inviterId != null) metadata.inviterId = String(input.inviterId);
    if (input.origin) metadata.signupOrigin = input.origin;

    const checkoutConfigurationId = await this.whopClientService.createCheckoutConfiguration({
      planId: input.whopPlanId,
      metadata,
    });
    return { checkoutConfigurationId };
  }
}
