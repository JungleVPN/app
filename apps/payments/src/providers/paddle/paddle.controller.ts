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
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicPaddleCheckoutDto,
  type PaddleCheckoutPayload,
} from '@workspace/types';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { PaddleClientService } from './paddle-client.service';
import { PaddleProvider } from './paddle.provider';

/** Mirrors the pattern the Stripe public route validates emails against. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller('paddle')
export class PaddleController {
  private readonly logger = new Logger(PaddleController.name);

  constructor(
    private readonly paddleProvider: PaddleProvider,
    private readonly paddleClientService: PaddleClientService,
  ) {}

  /**
   * Validates and prepares an anonymous Paddle checkout. Unlike Stripe, Paddle
   * Checkout is opened client-side against a catalog price id — this endpoint
   * exists only for what the browser cannot safely do itself: reject an
   * unconfigured period, rate-limit abuse, and check Paddle for an existing
   * active subscription on this email (which needs the secret API key).
   */
  @Post('public-create-checkout')
  @UseGuards(PublicCheckoutRateLimitGuard)
  async createPublicCheckout(
    @Body() dto: CreatePublicPaddleCheckoutDto,
    @Headers('origin') origin?: string,
  ): Promise<PaddleCheckoutPayload> {
    const email = dto.email?.trim().toLocaleLowerCase() ?? '';
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    // Pricing is checked first, so a rejected checkout costs no Paddle round trip.
    const payload = this.paddleProvider.buildCheckoutPayload({
      email,
      selectedPeriod: dto.selectedPeriod,
      toltReferralId: dto.toltReferralId,
      inviterId: dto.inviterId,
      origin,
    });

    if (await this.paddleProvider.hasActiveSubscription(email)) {
      throw this.activeSubscriptionConflict();
    }

    return payload;
  }

  /**
   * The 409 the checkout page recognises: it opens the "you already have a
   * subscription, log in to manage it" dialog on this code, same as Stripe's.
   */
  private activeSubscriptionConflict(): ConflictException {
    return new ConflictException({
      code: ACTIVE_SUBSCRIPTION_CODE,
      message: 'This email already has an active subscription',
    });
  }

  /**
   * Paddle webhook endpoint — raw body required for signature verification.
   * Only apps/webhook is a legitimate caller, gated behind the inter-service
   * secret in addition to the Paddle signature check below (mirrors Stripe).
   *
   * MVP scope: verifies the signature and logs the event. Does not yet
   * activate a Remnawave subscription — that lands when this integration
   * moves beyond the sandbox proof-of-concept.
   */
  @Post('webhook')
  @HttpCode(200)
  @UseGuards(InterServiceGuard)
  async webhook(
    @Req() req: RawBodyRequest<Record<string, unknown>>,
    @Headers('paddle-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Missing raw body for Paddle webhook');
      throw new BadRequestException('Missing raw body');
    }

    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Missing PADDLE_WEBHOOK_SECRET');
    }

    let event: { eventType: string; eventId: string };
    try {
      event = await this.paddleClientService.paddle.webhooks.unmarshal(
        rawBody.toString(),
        webhookSecret,
        signature,
      );
    } catch (err) {
      this.logger.error('Paddle webhook signature verification failed', err);
      throw new BadRequestException('Invalid Paddle signature');
    }

    this.logger.log(`Received Paddle webhook: ${event.eventType} (${event.eventId})`);
    return { received: true };
  }
}
