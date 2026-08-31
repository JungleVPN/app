import type { RawBodyRequest } from '@nestjs/common';
import {
  BadRequestException,
  Body,
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
import { getExtraDevicePrice, getPriceForPeriod } from '@payments/utils/amount';
import { StripePayment } from '@workspace/database';
import { type CreateStripeSessionDto, type PaymentPurpose } from '@workspace/types';
import type Stripe from 'stripe';
import { Repository } from 'typeorm';
import { AdminRoleGuard } from '../../auth/admin-role.guard';
import { AuthenticatedUserId } from '../../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { ClientOrServiceGuard } from '../../guards/client-or-service.guard';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { StripeProvider } from './stripe.provider';
import { isCheckoutSession, type Session } from './stripe.types';

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
    const selectedPeriod = dto.selectedPeriod;
    const purpose = dto.purchaseType ?? 'subscription';

    // A device slot is a one-off with its own price. Charging it through
    // STRIPE_EXTRA_DEVICE_PRICE_ID but recording a subscription period price
    // would misstate the sale in payment history and admin search.
    const amount = this.resolveAmount(purpose, selectedPeriod);

    const session = await this.stripeProvider.createPayment(
      {
        ...dto,
        userId,
        selectedPeriod,
      },
      origin,
    );

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
