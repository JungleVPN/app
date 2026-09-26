import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicWhopCheckoutDto,
  type WhopCheckoutPayload,
} from '@workspace/types';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { WhopProvider } from './whop.provider';

/** Mirrors the pattern the Stripe and Paddle public routes validate emails against. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller('whop')
export class WhopController {
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
}
