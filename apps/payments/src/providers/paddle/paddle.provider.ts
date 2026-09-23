import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EventEntity } from '@paddle/paddle-node-sdk';
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
   * The catalog price id Paddle Checkout should bill for a subscription
   * period. No fallback to another period: a period whose id is missing
   * would otherwise be silently sold at the wrong price (mirrors Stripe's
   * `getPriceId`).
   */
  getPriceId(days: number): string {
    const priceId = process.env[`PADDLE_PRICE_ID_DAYS_${days}`];
    if (!priceId) {
      throw new BadRequestException(`No Paddle price configured for a ${days} month plan`);
    }
    return priceId;
  }

  /**
   * Everything the frontend needs to open `Paddle.Checkout.open()` for the
   * public pricing page: the catalog price, and custom data so a later
   * webhook can identify the payer once the checkout settles.
   */
  buildCheckoutPayload(input: {
    email: string;
    selectedPeriod: number;
    toltReferralId?: string | null;
    inviterId?: number;
    origin?: string;
  }): PaddleCheckoutPayload {
    const priceId = this.getPriceId(input.selectedPeriod);

    const customData: Record<string, string> = { email: input.email };
    if (input.toltReferralId) customData.toltReferralId = input.toltReferralId;
    if (input.inviterId != null) customData.inviterId = String(input.inviterId);
    if (input.origin) customData.signupOrigin = input.origin;

    return { priceId, customData };
  }
}
