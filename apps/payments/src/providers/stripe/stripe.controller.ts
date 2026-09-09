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
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { getExtraDevicePrice, getPriceForPeriod } from '@payments/utils/amount';
import { StripePayment } from '@workspace/database';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicStripeSessionDto,
  type CreateStripeSessionDto,
  type PaymentPurpose,
} from '@workspace/types';
import type Stripe from 'stripe';
import { Repository } from 'typeorm';
import { AdminRoleGuard } from '../../auth/admin-role.guard';
import { AuthenticatedUserId } from '../../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { RemnaUserResolverService } from '../../auth/remna-user-resolver.service';
import { ClientOrServiceGuard } from '../../guards/client-or-service.guard';
import { InterServiceGuard } from '../../guards/inter-service.guard';
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
    private readonly analyticsClient: AnalyticsClientService,
    private readonly remnaUserResolver: RemnaUserResolverService,
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

    return this.openSession({ ...dto, userId }, origin);
  }

  /**
   * Unauthenticated checkout for the standalone payment page.
   *
   * The visitor has no account, so the payer email is resolved to a Remnawave
   * user (found or created) before opening the very same Stripe session an
   * authenticated caller gets — same pricing, same payment record, same
   * analytics, same webhook path.
   */
  @Post('public-create-session')
  async createPublicSession(
    @Body() dto: CreatePublicStripeSessionDto,
    @Headers('origin') origin?: string,
  ): Promise<Session> {
    const email = dto.email?.trim() ?? '';
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    // Priced before the account is touched: a bad period must not leave a
    // freshly created user behind for a checkout that was never opened.
    this.resolveAmount('subscription', dto.selectedPeriod);

    const userId = await this.remnaUserResolver.resolveOrCreateByEmail(email, {
      inviterId: dto.inviterId,
      origin,
    });

    // An authenticated caller who already subscribes is answered with a Billing
    // Portal session. This caller proved nothing but knowledge of an email
    // address, so the same answer would hand anyone a live self-service URL for
    // that subscriber's account — invoices, card details, cancellation. Refuse
    // instead, and let the page send them to sign in.
    await this.refuseIfAlreadySubscribed(userId);

    const session = await this.openSession(
      {
        userId,
        selectedPeriod: dto.selectedPeriod,
        toltReferralId: dto.toltReferralId,
        metadata: { email, userId: String(userId) },
      },
      origin,
    );

    // The check above races a subscription created between it and the session,
    // and it is the only thing standing between an email address and someone
    // else's portal. Never let a non-checkout session leave this route.
    if (!isCheckoutSession(session)) {
      throw this.activeSubscriptionConflict();
    }

    return session;
  }

  /** Refuses the anonymous route for a user who already subscribes. */
  private async refuseIfAlreadySubscribed(userId: number): Promise<void> {
    const customerId = await this.stripeProvider.getCustomerId(userId);
    if (!customerId) return;

    if (await this.stripeProvider.hasActiveSubscription(customerId)) {
      throw this.activeSubscriptionConflict();
    }
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
   * Opens a Stripe session and records the sale. Shared by the authenticated
   * and public routes so both stay identical in pricing, persistence and
   * analytics — only how the payer is identified differs.
   */
  private async openSession(dto: CreateStripeSessionDto, origin?: string): Promise<Session> {
    const { userId, selectedPeriod } = dto;
    const purpose = dto.purchaseType ?? 'subscription';

    // A device slot is a one-off with its own price. Charging it through
    // STRIPE_EXTRA_DEVICE_PRICE_ID but recording a subscription period price
    // would misstate the sale in payment history and admin search.
    const amount = this.resolveAmount(purpose, selectedPeriod);

    const session = await this.stripeProvider.createPayment(dto, origin);

    // An existing subscriber is answered with a Billing Portal session, which is
    // not a sale: nothing was bought, and no webhook ever references a `bps_…`
    // id. Recording one would strand a 'pending' row at full price on every
    // visit to the portal, inflating payment history and admin search.
    if (!isCheckoutSession(session)) return session;

    const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    const record = this.stripePaymentRepo.create({
      id: session.id,
      url: session.url,
      customer: customer,
      status: 'pending',
      amount: +amount,
      currency: 'EUR',
      userId,
      purpose,
      paidAt: null,
      stripeSubscriptionId: null,
      invoiceUrl: null,
    });
    await this.stripePaymentRepo.save(record);

    await this.analyticsClient.track({
      event: 'checkout_started',
      userId,
      provider: 'stripe',
      purpose,
      amount,
      currency: 'EUR',
    });

    return session;
  }

  /**
   * The EUR price this session records, by what is being bought.
   *
   * There is no ValidationPipe on this controller, so an unusable
   * `selectedPeriod` arrives here as an ordinary value. A bad request is the
   * client's fault and answered as one — the price lookup throwing would
   * otherwise surface as a 500.
   */
  private resolveAmount(purpose: PaymentPurpose, selectedPeriod: number): string {
    try {
      return purpose === 'extra_device'
        ? getExtraDevicePrice('EUR')
        : getPriceForPeriod('EUR', selectedPeriod);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
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

    // Verify the signature first. A bad signature is not retryable, so reject
    // it with a 400 — Stripe won't redeliver and we don't touch business logic.
    let event: Stripe.Event;
    try {
      event = this.stripeProvider.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || '',
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
