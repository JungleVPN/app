import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EventEntity } from '@paddle/paddle-node-sdk';
import { PlanService } from '@payments/catalog/plan.service';
import { toSavedMethodDto } from '@payments/utils/saved-method';
import { PaddlePayment, SavedPaymentMethod } from '@workspace/database';
import type {
  PaddleCheckoutPayload,
  ProviderPortalDto,
  ProviderSubscriptionDto,
} from '@workspace/types';
import { Repository } from 'typeorm';
import { PaddleClientService } from './paddle-client.service';
import { PaddleWebhookService } from './paddle-webhook.service';

@Injectable()
export class PaddleProvider {
  private readonly logger = new Logger(PaddleProvider.name);

  constructor(
    private readonly paddleClientService: PaddleClientService,
    private readonly paddleWebhookService: PaddleWebhookService,
    @InjectRepository(PaddlePayment) private readonly repository: Repository<PaddlePayment>,
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepository: Repository<SavedPaymentMethod>,
    private readonly planService: PlanService,
  ) {}

  async handleWebhook(event: EventEntity): Promise<void> {
    await this.paddleWebhookService.handleWebhook(event);
  }

  async hasActiveSubscription(email: string): Promise<boolean> {
    return this.paddleClientService.hasActiveSubscription(email);
  }

  /** The Paddle customer id last recorded for `userId`, or null if they've never paid via Paddle. */
  async getCustomerId(userId: number): Promise<string | null> {
    const lastPayment = await this.repository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return lastPayment?.customer ?? null;
  }

  /**
   * Whether `userId` is subscribed through Paddle, answered from our own
   * `saved_payment_methods` rows rather than Paddle's API — mirrors Stripe's
   * `getSubscriptionStatus`, including its reliance on the webhooks that keep
   * those rows true.
   */
  async getSubscriptionStatus(userId: number): Promise<ProviderSubscriptionDto> {
    const methods = await this.savedMethodRepository.find({
      where: { userId, provider: 'paddle', isActive: true },
      order: { createdAt: 'DESC' },
    });

    return { active: methods.length > 0, methods: methods.map(toSavedMethodDto) };
  }

  /**
   * A fresh Customer Portal URL, minted on demand — the one thing only Paddle
   * can produce (mirrors Stripe's `getPortalUrl`).
   */
  async getPortalUrl(userId: number): Promise<ProviderPortalDto> {
    const customerId = await this.getCustomerId(userId);
    if (!customerId) return { portalUrl: null };

    try {
      const subscriptionId = await this.paddleClientService.findActiveSubscriptionId(customerId);
      if (!subscriptionId) return { portalUrl: null };

      const portalUrl = await this.paddleClientService.createPortalUrl(customerId, subscriptionId);
      return { portalUrl };
    } catch (error) {
      this.logger.error(`Failed to create portal session for customer ${customerId}`, error);
      return { portalUrl: null };
    }
  }

  /**
   * Everything the frontend needs to open `Paddle.Checkout.open()` for the
   * public pricing page: the catalog price, and custom data so a later
   * webhook can identify the payer once the checkout settles.
   */
  async buildCheckoutPayload(input: {
    email: string;
    planId: string;
    toltReferralId?: string | null;
    inviterId?: number;
    origin?: string;
  }): Promise<PaddleCheckoutPayload> {
    const plan = await this.planService.getForCheckout(input.planId, 'paddle');
    const priceId = plan.providerPriceId;

    if (!priceId) {
      throw Error('No priceId was found in buildCheckoutPayload');
    }

    const customData: Record<string, string> = { email: input.email };
    if (input.toltReferralId) customData.toltReferralId = input.toltReferralId;
    if (input.inviterId != null) customData.inviterId = String(input.inviterId);
    if (input.origin) customData.signupOrigin = input.origin;

    return { priceId, customData };
  }
}
