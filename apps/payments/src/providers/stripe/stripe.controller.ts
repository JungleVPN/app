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
import { StripePayment } from '@workspace/database';
import type Stripe from 'stripe';
import { Repository } from 'typeorm';
import { AdminGuard } from '../../admin/admin.guard';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { StripeProvider } from './stripe.provider';
import type { CreateStripePaymentDto, Session } from './stripe.types';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    @InjectRepository(StripePayment)
    private readonly stripePaymentRepo: Repository<StripePayment>,
    private readonly stripeProvider: StripeProvider,
  ) {}

  /** List all Stripe payments, newest first */
  @Get()
  async list() {
    return this.stripePaymentRepo.find({ order: { createdAt: 'DESC' } });
  }

  /** Active-subscription status + Billing Portal URL for a user */
  @Get('subscription/:userId')
  async getSubscriptionStatus(@Param('userId') userId: string) {
    return this.stripeProvider.getSubscriptionStatus(userId);
  }

  /** Get a single Stripe payment by id */
  @Get(':id')
  async getById(@Param('id') id: string) {
    const payment = await this.stripePaymentRepo.findOneBy({ id });
    if (!payment) throw new NotFoundException(`Stripe payment ${id} not found`);
    return payment;
  }

  /** Update a Stripe payment status (and optional fields) — admin only, never called by the webhook/checkout flow */
  @Patch(':id')
  @UseGuards(AdminGuard)
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

  /** Create a checkout / portal session via Stripe */
  @Post('create-session')
  async createSession(@Body() dto: CreateStripePaymentDto): Promise<Session> {
    const session = await this.stripeProvider.createPayment(dto);

    const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    const existing = await this.stripePaymentRepo.findOne({
      where: { customer },
      order: { createdAt: 'DESC' },
    });

    if (!existing) {
      const record = this.stripePaymentRepo.create({
        id: session.id,
        url: session.url,
        customer: customer,
        status: 'pending',
        amount: +dto.payment.amount,
        currency: dto.payment.currency,
        userId: dto.userId,
        purpose: dto.purchaseType ?? 'subscription',
        paidAt: null,
        stripeSubscriptionId: null,
        invoiceUrl: null,
      });
      await this.stripePaymentRepo.save(record);
    }

    return session;
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
