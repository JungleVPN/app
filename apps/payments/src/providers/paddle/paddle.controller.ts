import type { RawBodyRequest } from '@nestjs/common';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { EventEntity } from '@paddle/paddle-node-sdk';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicPaddleCheckoutDto,
  type PaddleCheckoutPayload,
  type PaddleSubscriptionStatusDto,
} from '@workspace/types';
import { AuthenticatedUserId } from '../../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { PaddleProvider } from './paddle.provider';
import { PaddleClientService } from './paddle-client.service';

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

  /** Active-subscription status + Customer Portal URL for the authenticated user. */
  @Get('subscription')
  @UseGuards(ClientUserGuard)
  async getSubscriptionStatus(
    @AuthenticatedUserId() userId: number,
  ): Promise<PaddleSubscriptionStatusDto> {
    return this.paddleProvider.getSubscriptionStatus(userId);
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
   * Verify the signature first. A bad signature is not retryable, so reject
   * it with a 400 — Paddle won't redeliver and we don't touch business logic.
   * Let processing errors propagate (→ 5xx): Paddle retries non-2xx
   * deliveries, which is the recovery path `PaddleWebhookService` relies on.
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

    let event: EventEntity;
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
    await this.paddleProvider.handleWebhook(event);
    return { received: true };
  }
}
