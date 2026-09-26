import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanService } from '@payments/catalog/plan.service';
import { toSavedMethodDto } from '@payments/utils/saved-method';
import { SavedPaymentMethod } from '@workspace/database';
import type { ProviderSubscriptionDto, WhopCancelDto, WhopCheckoutPayload } from '@workspace/types';
import { Repository } from 'typeorm';
import { WhopClientService } from './whop-client.service';
import { WhopWebhookService } from './whop-webhook.service';

@Injectable()
export class WhopProvider {
  constructor(
    private readonly whopClientService: WhopClientService,
    private readonly whopWebhookService: WhopWebhookService,
    private readonly planService: PlanService,
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepository: Repository<SavedPaymentMethod>,
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

  /**
   * Whether `userId` is subscribed through Whop, answered from our own
   * `saved_payment_methods` rows rather than Whop's API — mirrors Paddle's
   * `getSubscriptionStatus`, including its reliance on the webhooks that keep
   * those rows true.
   */
  async getSubscriptionStatus(userId: number): Promise<ProviderSubscriptionDto> {
    const methods = await this.findActiveMethods(userId);
    return { active: methods.length > 0, methods: methods.map(toSavedMethodDto) };
  }

  /**
   * Cancels `userId`'s Whop membership at period end. Takes the place of
   * Paddle's `getPortalUrl`: Whop has no per-customer portal to send the user
   * to, so the one self-service action is done here, on the user's behalf.
   */
  async cancelSubscription(userId: number): Promise<WhopCancelDto> {
    const [latest] = await this.findActiveMethods(userId);
    if (!latest) {
      throw new NotFoundException('No active Whop subscription to cancel');
    }
    return this.whopClientService.cancelMembership(latest.paymentMethodId);
  }

  private findActiveMethods(userId: number): Promise<SavedPaymentMethod[]> {
    return this.savedMethodRepository.find({
      where: { userId, provider: 'whop', isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
