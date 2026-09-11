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
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StripePayment } from '@workspace/database';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicStripeSessionDto,
  type CreateStripeSessionDto,
} from '@workspace/types';
import type Stripe from 'stripe';
import { Repository } from 'typeorm';
import { AdminRoleGuard } from '../../auth/admin-role.guard';
import { AuthenticatedUserId } from '../../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { ClientOrServiceGuard } from '../../guards/client-or-service.guard';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { StripeProvider } from './stripe.provider';
import { isCheckoutSession, type Session } from './stripe.types';

/** Mirrors the pattern the remnawave service validates lookups against. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    @InjectRepository(StripePayment)
    private readonly stripePaymentRepo: Repository<StripePayment>,
    private readonly stripeProvider: StripeProvider,
  ) {}

  /** List all Stripe payments, newest first — internal use only */
  @Get()
  @UseGuards(InterServiceGuard)
  async list() {
    return this.stripePaymentRepo.find({ order: { createdAt: 'DESC' } });
  }

  /** Active-subscription status + Billing Portal URL for the authenticated user */
  @Get('subscription')
  @UseGuards(ClientUserGuard)
  async getSubscriptionStatus(
    @AuthenticatedUserId() userId: number,
    @Headers('origin') origin?: string,
  ) {
    return this.stripeProvider.getSubscriptionStatus(userId, origin);
  }

  /** Get a single Stripe payment by id — internal use only */
  @Get(':id')
  @UseGuards(InterServiceGuard)
  async getById(@Param('id') id: string) {
    const payment = await this.stripePaymentRepo.findOneBy({ id });
    if (!payment) throw new NotFoundException(`Stripe payment ${id} not found`);
    return payment;
  }

  /** Update a Stripe payment status — admin identity validated via credential */
  @Patch(':id')
  @UseGuards(ClientUserGuard, AdminRoleGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status?: string; paidAt?: string | null },
  ) {
    const payment = await this.stripePaymentRepo.findOneBy({ id });
    if (!payment) throw new NotFoundException(`Stripe payment ${id} not found`);

    if (body.status !== undefined) payment.status = body.status;
    if (body.paidAt !== undefined) payment.paidAt = body.paidAt ? new Date(body.paidAt) : null;

    return this.stripePaymentRepo.save(payment);
  }

  @Post('create-session')
  @UseGuards(ClientOrServiceGuard)
  async createSession(
    @Body() dto: CreateStripeSessionDto,
    @AuthenticatedUserId() authenticatedUserId: number | undefined,
    @Headers('origin') origin?: string,
  ): Promise<Session> {
    const userId = authenticatedUserId ?? dto.userId;

    return this.stripeProvider.openSession({ ...dto, userId }, origin);
  }

  @Post('public-create-session')
  @UseGuards(PublicCheckoutRateLimitGuard)
  async createPublicSession(
    @Body() dto: CreatePublicStripeSessionDto,
    @Headers('origin') origin?: string,
  ): Promise<Session> {
    const email = dto.email?.trim().toLocaleLowerCase() ?? '';
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    this.stripeProvider.resolveAmount('subscription', dto.selectedPeriod);

    await this.refuseIfAlreadySubscribed(email);

    const session = await this.stripeProvider.openSession(
      {
        userId: null,
        selectedPeriod: dto.selectedPeriod,
        toltReferralId: dto.toltReferralId,
        metadata: {
          email,
          ...(dto.inviterId != null && { inviterId: String(dto.inviterId) }),
          ...(origin && { signupOrigin: origin }),
        },
      },
      origin,
    );

    if (!isCheckoutSession(session)) {
      throw this.activeSubscriptionConflict();
    }

    return session;
  }

  private async refuseIfAlreadySubscribed(email: string): Promise<void> {
    const customerId = await this.stripeProvider.findCustomerIdByEmail(email);
    if (!customerId) return;

    if (await this.stripeProvider.hasActiveSubscription(customerId)) {
      throw this.activeSubscriptionConflict();
    }
    return;
  }

  /**
   * The 409 the checkout page recognises: it opens the "you already have a
   * subscription, log in to manage it" dialog on this code, rather than showing
   * the generic "we could not start the payment" failure.
   */
  private activeSubscriptionConflict(): ConflictException {
    return new ConflictException({
      code: ACTIVE_SUBSCRIPTION_CODE,
      message: 'This email already has an active subscription',
    });
  }

  /**
   * Stripe webhook endpoint — raw body required for signature verification.
   * Only apps/webhook is a legitimate caller, so it's also gated behind the
   * inter-service secret in addition to the Stripe signature check below.
   */
  @Post('webhook')
  @HttpCode(200)
  @UseGuards(InterServiceGuard)
  async webhook(
    @Req() req: RawBodyRequest<Record<string, unknown>>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Missing raw body for Stripe webhook');
      throw new BadRequestException('Missing raw body');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new BadRequestException('Missing STRIPE_WEBHOOK_SECRET');
    }
    // Verify the signature first. A bad signature is not retryable, so reject
    // it with a 400 — Stripe won't redeliver and we don't touch business logic.
    let event: Stripe.Event;
    try {
      event = this.stripeProvider.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      this.logger.error('Stripe webhook signature verification failed', err);
      throw new BadRequestException('Invalid Stripe signature');
    }

    // Let processing errors propagate (→ 5xx). Stripe retries non-2xx
    // deliveries, which is exactly the recovery path the handlers rely on
    // (e.g. a transient remnawave outage during a renewal).
    await this.stripeProvider.handleWebhook(event);
    return { received: true };
  }
}
