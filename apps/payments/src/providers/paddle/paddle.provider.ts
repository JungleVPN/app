import { BadRequestException, Injectable } from '@nestjs/common';
import type { EventEntity } from '@paddle/paddle-node-sdk';
import type { PaddleCheckoutPayload } from '@workspace/types';
import { PaddleClientService } from './paddle-client.service';
import { PaddleWebhookService } from './paddle-webhook.service';

@Injectable()
export class PaddleProvider {
  constructor(
    private readonly paddleClientService: PaddleClientService,
    private readonly paddleWebhookService: PaddleWebhookService,
  ) {}

  async handleWebhook(event: EventEntity): Promise<void> {
    await this.paddleWebhookService.handleWebhook(event);
  }

  async hasActiveSubscription(email: string): Promise<boolean> {
    return this.paddleClientService.hasActiveSubscription(email);
  }

  /**
   * The catalog price id Paddle Checkout should bill for a subscription
   * period. No fallback to another period: a period whose id is missing
   * would otherwise be silently sold at the wrong price (mirrors Stripe's
   * `getPriceId`).
   */
  getPriceId(selectedPeriod: number): string {
    const months = selectedPeriod || 1;
    const priceId = process.env[`PADDLE_PRICE_ID_MONTH_${months}`];
    if (!priceId) {
      throw new BadRequestException(`No Paddle price configured for a ${months} month plan`);
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
