import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StripePayment } from '@workspace/database';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import type { CheckoutSession, CreateStripePaymentDto } from './stripe.types';
import { StripeWebhookService } from './stripe-webhook.service';

@Injectable()
export class StripeProvider {
  readonly stripe: Stripe;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(
    readonly stripeWebhookService: StripeWebhookService,
    @InjectRepository(StripePayment) private repository: Repository<StripePayment>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_API_KEY || '');
  }

  async handleWebhook(payload: Stripe.Event) {
    await this.stripeWebhookService.handleWebhook(payload);
  }

  async createPayment(dto: CreateStripePaymentDto) {
    const priceId = this.getPriceId();
    const customerId = await this.getCustomerId(dto.userId);

    if (customerId) {
      const hasActiveSubscription = await this.hasActiveSubscription(customerId);
      if (hasActiveSubscription) {
        return this.createPortalSession(customerId);
      }
      return this.createCheckoutSession(priceId, customerId);
    }

    const newCustomer = await this.getOrCreateCustomer(dto, null);
    return this.createCheckoutSession(priceId, newCustomer);
  }

  private async createCheckoutSession(priceId: string, customer: string): Promise<CheckoutSession> {
    try {
      return await this.stripe.checkout.sessions.create({
        customer,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: process.env.BOT_RETURN_URL || 'https://t.me/your_bot_username',
        cancel_url: process.env.BOT_RETURN_URL || 'https://t.me/your_bot_username',
        phone_number_collection: {
          enabled: false,
        },
      });
    } catch (error) {
      this.logger.error('Error creating Stripe session', error);
      throw error;
    }
  }

  async createPortalSession(
    customer: string,
  ): Promise<Stripe.Response<Stripe.BillingPortal.Session>> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer,
        return_url: process.env.BOT_RETURN_URL || 'https://t.me/your_bot_username',
        configuration: process.env.STRIPE_CUSTOMER_PORTAL_CONFIG || '',
      });

      await this.repository.update(
        { customer },
        {
          url: session.url,
        },
      );

      return session;
    } catch (error) {
      this.logger.error(`Error creating portal session for customer ${customer}`, error);
      throw error;
    }
  }

  async retrieveCustomer(customerId: string | null) {
    if (!customerId) return null;
    return await this.stripe.customers.retrieve(customerId);
  }

  private async getOrCreateCustomer(
    dto: CreateStripePaymentDto,
    customer: string | null,
  ): Promise<string> {
    if (customer) {
      return customer;
    }
    const newCustomer = await this.stripe.customers.create({
      email: dto.metadata.email,
      metadata: { ...dto.metadata },
    });
    return newCustomer.id;
  }

  async getCustomerId(userId: string): Promise<string | null> {
    const lastPayment = await this.repository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return lastPayment?.customer || null;
  }

  async hasActiveSubscription(customerId: string): Promise<boolean> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
      });

      return subscriptions.data.some((sub) => sub.status === 'active' || sub.status === 'trialing');
    } catch (error) {
      this.logger.error(`Error checking subscription for customer ${customerId}`, error);
      return false;
    }
  }

  private getPriceId(): string {
    const priceId = process.env.STRIPE_PRICE_ID || '';
    if (!priceId) {
      this.logger.error('STRIPE_PRICE_ID is not configured');
      throw new Error('Price configuration missing');
    }
    return priceId;
  }
}
