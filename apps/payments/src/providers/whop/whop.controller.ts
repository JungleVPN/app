import type { RawBodyRequest } from '@nestjs/common';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { unwrapWebhook } from '@whop/sdk/helpers';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CheckWhopPromoCodeDto,
  type CreatePublicWhopCheckoutDto,
  type PayPublicWhopCheckoutDto,
  type ProviderSubscriptionDto,
  type WhopCancelDto,
  type WhopCheckoutPayload,
  type WhopPaymentDto,
  type WhopPaymentStatusDto,
  type WhopPromoCodeDto,
  type WhopResumeDto,
} from '@workspace/types';
import { AdminService } from '../../admin/admin.service';
import { AuthenticatedUserId } from '../../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { PublicPromoCodeRateLimitGuard } from '../../guards/public-promo-code-rate-limit.guard';
import { WhopProvider } from './whop.provider';

/** Mirrors the pattern the Stripe and Paddle public routes validate emails against. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What `payments.createConfirmationToken()` mints in the browser. */
const CONFIRMATION_TOKEN_PREFIX = 'ctok_';

@Controller('whop')
export class WhopController {
  private readonly logger = new Logger(WhopController.name);

  constructor(
    private readonly whopProvider: WhopProvider,
    private readonly adminService: AdminService,
    private readonly analyticsClient: AnalyticsClientService,
  ) {}

  /**
   * Validates an anonymous Whop checkout before the browser mounts the card
   * form. Nothing is created on Whop here: the payment only exists once the
   * payer submits their card to `public-pay`.
   */
  @Post('public-create-checkout')
  @UseGuards(PublicCheckoutRateLimitGuard)
  async createPublicCheckout(
    @Body() dto: CreatePublicWhopCheckoutDto,
    @Ip() ip: string,
  ): Promise<WhopCheckoutPayload> {
    const { whopPlanId } = await this.validateCheckout(dto, ip);
    return this.whopProvider.checkoutTarget(whopPlanId);
  }

  /**
   * Charges the card the browser tokenised. The checkout is validated again —
   * nothing ties this call to an earlier `public-create-checkout` — so a
   * payer who subscribed in the meantime is refused before any charge.
   *
   * Not behind the public-checkout rate limit: its per-email allowance would
   * lock out a payer retrying after a decline, and every call already needs
   * a confirmation token only Whop's card fields can mint. A call naming a
   * promo code is capped as a guess, though: an invalid code is refused
   * before the token ever reaches Whop, so a made-up token would otherwise
   * test codes without limit.
   */
  @Post('public-pay')
  @UseGuards(PublicPromoCodeRateLimitGuard)
  async payPublicCheckout(
    @Body() dto: PayPublicWhopCheckoutDto,
    @Ip() ip: string,
    @Headers('origin') origin?: string,
  ): Promise<WhopPaymentDto> {
    if (!dto.confirmationToken?.startsWith(CONFIRMATION_TOKEN_PREFIX)) {
      throw new BadRequestException('A confirmation token is required');
    }
    if (dto.promoCode != null && typeof dto.promoCode !== 'string') {
      throw new BadRequestException('A promo code must be text');
    }
    const { email, whopPlanId } = await this.validateCheckout(dto, ip);

    return this.whopProvider.payCheckout({
      email,
      whopPlanId,
      confirmationToken: dto.confirmationToken,
      returnUrl: dto.returnUrl,
      toltReferralId: dto.toltReferralId,
      inviterId: dto.inviterId,
      origin,
      promoCode: dto.promoCode,
    });
  }

  /**
   * Whether our webhook has fulfilled a payment, so the checkout can hold the
   * payer until their subscription is actually extended. The checkout is
   * anonymous, so knowledge of the payment id is the claim, and the answer
   * carries only whether it is fulfilled, and whether it is the payer's first
   * for Google Ads — mirrors YooKassa's public status.
   */
  @Get('public-payment-status/:id')
  async getPublicPaymentStatus(@Param('id') id: string): Promise<WhopPaymentStatusDto> {
    const status = await this.whopProvider.getPaymentStatus(id);
    const firstPayment =
      status.fulfilled &&
      (await this.adminService.isFirstPayment({ provider: 'whop', paymentId: id }));
    return { ...status, firstPayment };
  }

  /**
   * Whether a promo code discounts the chosen plan, so the checkout page can
   * confirm it before the payer pays. Guesses are capped on their own
   * allowance, so nobody can guess codes at speed and trying a few codes never
   * blocks the payer from starting a checkout.
   */
  @Post('public-promo-code')
  @HttpCode(200)
  @UseGuards(PublicPromoCodeRateLimitGuard)
  async checkPublicPromoCode(
    @Body() dto: CheckWhopPromoCodeDto,
    @Ip() ip: string,
  ): Promise<WhopPromoCodeDto> {
    const promoCode = typeof dto.promoCode === 'string' ? dto.promoCode.trim() : '';
    if (!promoCode) {
      throw new BadRequestException('A promo code is required');
    }
    const whopPlanId = await this.whopProvider.resolveCheckoutPlanId(dto.planId, ip || null);
    return this.whopProvider.checkPromoCode({ promoCode, whopPlanId });
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
   * Reverses the authenticated user's own pending cancellation. Like cancel,
   * the user id comes only from the session.
   */
  @Post('resume')
  @HttpCode(200)
  @UseGuards(ClientUserGuard)
  async resumeSubscription(@AuthenticatedUserId() userId: number): Promise<WhopResumeDto> {
    return this.whopProvider.resumeSubscription(userId);
  }

  /**
   * The checks every public checkout call runs: a well-formed email, a plan
   * on sale, and no live membership for that email. Pricing is checked first,
   * so a rejected checkout costs no Whop round trip.
   */
  private async validateCheckout(
    dto: CreatePublicWhopCheckoutDto,
    ip: string,
  ): Promise<{ email: string; whopPlanId: string }> {
    const email = dto.email?.trim().toLocaleLowerCase() ?? '';
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    const whopPlanId = await this.whopProvider.resolveCheckoutPlanId(dto.planId, ip || null);

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
      await this.reportRejectedWebhook('missing raw body');
      throw new BadRequestException('Missing raw body');
    }

    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      await this.reportRejectedWebhook('missing WHOP_WEBHOOK_SECRET');
      throw new BadRequestException('Missing WHOP_WEBHOOK_SECRET');
    }

    let event: unknown;
    try {
      event = unwrapWebhook(rawBody.toString(), { headers, key: webhookSecret });
    } catch (err: unknown) {
      await this.reportRejectedWebhook(
        `invalid signature: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('Invalid Whop signature');
    }

    await this.whopProvider.handleWebhook(event);
    return { received: true };
  }

  /**
   * A rejected delivery is never retried by Whop, and a misconfigured secret
   * rejects every one — so each rejection is reported, not just logged.
   */
  private async reportRejectedWebhook(reason: string): Promise<void> {
    this.logger.error(`Whop webhook rejected: ${reason}`);
    await this.analyticsClient.track({
      event: 'payment_error',
      kind: 'webhook_failed',
      provider: 'whop',
      userId: null,
      paymentId: null,
      reason,
    });
  }
}
