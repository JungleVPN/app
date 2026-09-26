import type { RawBodyRequest } from '@nestjs/common';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { unwrapWebhook } from '@whop/sdk/helpers';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicWhopCheckoutDto,
  type WhopCheckoutPayload,
} from '@workspace/types';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { WhopProvider } from './whop.provider';

/** Mirrors the pattern the Stripe and Paddle public routes validate emails against. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller('whop')
export class WhopController {
  private readonly logger = new Logger(WhopController.name);

  constructor(private readonly whopProvider: WhopProvider) {}

  /**
   * Validates and prepares an anonymous Whop checkout. Like Paddle, the
   * browser mounts the checkout itself; unlike Paddle, what it mounts is a
   * checkout configuration that only Whop can create — so the duplicate
   * check runs first, and a rejected payer leaves nothing behind on Whop.
   */
  @Post('public-create-checkout')
  @UseGuards(PublicCheckoutRateLimitGuard)
  async createPublicCheckout(
    @Body() dto: CreatePublicWhopCheckoutDto,
    @Headers('origin') origin?: string,
  ): Promise<WhopCheckoutPayload> {
    const email = dto.email?.trim().toLocaleLowerCase() ?? '';
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    // Pricing is checked first, so a rejected checkout costs no Whop round trip.
    const whopPlanId = await this.whopProvider.resolveCheckoutPlanId(dto.planId);

    if (await this.whopProvider.hasActiveSubscription(email)) {
      throw this.activeSubscriptionConflict();
    }

    return this.whopProvider.createCheckout({
      email,
      whopPlanId,
      toltReferralId: dto.toltReferralId,
      inviterId: dto.inviterId,
      origin,
    });
  }

  /**
   * The 409 the checkout page recognises: it opens the "you already have a
   * subscription, log in to manage it" dialog on this code, same as Paddle's.
   */
  private activeSubscriptionConflict(): ConflictException {
    return new ConflictException({
      code: ACTIVE_SUBSCRIPTION_CODE,
      message: 'This email already has an active subscription',
    });
  }

  /**
   * Whop webhook endpoint — raw body required for signature verification.
   * Only apps/webhook is a legitimate caller, gated behind the inter-service
   * secret in addition to Whop's Standard Webhooks signature (mirrors Paddle).
   *
   * A bad signature is not retryable, so it is rejected with a 400 before
   * any business logic runs. Processing errors propagate (→ 5xx): Whop
   * retries non-2xx deliveries, which is the recovery path
   * `WhopWebhookService` relies on.
   */
  @Post('webhook')
  @HttpCode(200)
  @UseGuards(InterServiceGuard)
  async webhook(
    @Req() req: RawBodyRequest<Record<string, unknown>>,
    @Headers() headers: Record<string, string>,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Missing raw body for Whop webhook');
      throw new BadRequestException('Missing raw body');
    }

    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Missing WHOP_WEBHOOK_SECRET');
    }

    let event: unknown;
    try {
      event = unwrapWebhook(rawBody.toString(), { headers, key: webhookSecret });
    } catch (err) {
      this.logger.error('Whop webhook signature verification failed', err);
      throw new BadRequestException('Invalid Whop signature');
    }

    this.logger.log(`Received Whop webhook ${headers['webhook-id'] ?? '(no id)'}`);
    await this.whopProvider.handleWebhook(event);
    return { received: true };
  }
}
