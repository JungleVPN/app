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
import { unwrapWebhook } from '@whop/sdk/helpers';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicWhopCheckoutDto,
  type PayPublicWhopCheckoutDto,
  type ProviderSubscriptionDto,
  type WhopCancelDto,
  type WhopCheckoutPayload,
  type WhopPaymentDto,
} from '@workspace/types';
import { AuthenticatedUserId } from '../../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { WhopProvider } from './whop.provider';

/** Mirrors the pattern the Stripe and Paddle public routes validate emails against. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What `payments.createConfirmationToken()` mints in the browser. */
const CONFIRMATION_TOKEN_PREFIX = 'ctok_';

@Controller('whop')
export class WhopController {
  private readonly logger = new Logger(WhopController.name);

  constructor(private readonly whopProvider: WhopProvider) {}

  /**
   * Validates an anonymous Whop checkout before the browser mounts the card
   * form. Nothing is created on Whop here: the payment only exists once the
   * payer submits their card to `public-pay`.
   */
  @Post('public-create-checkout')
  @UseGuards(PublicCheckoutRateLimitGuard)
  async createPublicCheckout(
    @Body() dto: CreatePublicWhopCheckoutDto,
  ): Promise<WhopCheckoutPayload> {
    const { whopPlanId } = await this.validateCheckout(dto);
    return this.whopProvider.checkoutTarget(whopPlanId);
  }

  /**
   * Charges the card the browser tokenised. The checkout is validated again —
   * nothing ties this call to an earlier `public-create-checkout` — so a
   * payer who subscribed in the meantime is refused before any charge.
   *
   * Not behind the public-checkout rate limit: its per-email allowance would
   * lock out a payer retrying after a decline, and every call already needs
   * a confirmation token only Whop's card fields can mint.
   */
  @Post('public-pay')
  async payPublicCheckout(
    @Body() dto: PayPublicWhopCheckoutDto,
    @Headers('origin') origin?: string,
  ): Promise<WhopPaymentDto> {
    if (!dto.confirmationToken?.startsWith(CONFIRMATION_TOKEN_PREFIX)) {
      throw new BadRequestException('A confirmation token is required');
    }
    const { email, whopPlanId } = await this.validateCheckout(dto);

    return this.whopProvider.payCheckout({
      email,
      whopPlanId,
      confirmationToken: dto.confirmationToken,
      returnUrl: dto.returnUrl,
      toltReferralId: dto.toltReferralId,
      inviterId: dto.inviterId,
      origin,
    });
  }

  /**
   * Active-subscription status for the authenticated user, read from our own
   * saved-method rows — no Whop call (mirrors Paddle).
   */
  @Get('subscription')
  @UseGuards(ClientUserGuard)
  async getSubscriptionStatus(
    @AuthenticatedUserId() userId: number,
  ): Promise<ProviderSubscriptionDto> {
    return this.whopProvider.getSubscriptionStatus(userId);
  }

  /**
   * Cancels the authenticated user's own Whop subscription at period end —
   * Whop's stand-in for Paddle's portal. The user id comes only from the
   * session, so no request can reach another user's membership.
   */
  @Post('cancel')
  @HttpCode(200)
  @UseGuards(ClientUserGuard)
  async cancelSubscription(@AuthenticatedUserId() userId: number): Promise<WhopCancelDto> {
    return this.whopProvider.cancelSubscription(userId);
  }

  /**
   * The checks every public checkout call runs: a well-formed email, a plan
   * on sale, and no live membership for that email. Pricing is checked first,
   * so a rejected checkout costs no Whop round trip.
   */
  private async validateCheckout(
    dto: CreatePublicWhopCheckoutDto,
  ): Promise<{ email: string; whopPlanId: string }> {
    const email = dto.email?.trim().toLocaleLowerCase() ?? '';
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    const whopPlanId = await this.whopProvider.resolveCheckoutPlanId(dto.planId);

    if (await this.whopProvider.hasActiveSubscription(email)) {
      throw this.activeSubscriptionConflict();
    }
    return { email, whopPlanId };
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

    await this.whopProvider.handleWebhook(event);
    return { received: true };
  }
}
