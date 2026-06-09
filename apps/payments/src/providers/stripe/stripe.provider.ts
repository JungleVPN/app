import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StripePayment } from '@workspace/database';
import type { StripeSubscriptionStatusDto } from '@workspace/types';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import type { BillingPortalSession, CheckoutSession, CreateStripePaymentDto } from './stripe.types';
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
    const purchaseType = dto.purchaseType ?? 'subscription';
    const priceId = this.getPriceId(purchaseType);
    const customerId = await this.getCustomerId(dto.userId);

    if (customerId) {
      // Only redirect to billing portal for subscription renewals, never for extra-device.
      if (purchaseType === 'subscription') {
        const hasActiveSubscription = await this.hasActiveSubscription(customerId);
        if (hasActiveSubscription) {
          return this.createPortalSession(customerId);
        }
      }
      return this.createCheckoutSession(priceId, customerId, purchaseType, dto.userId);
    }

    const newCustomer = await this.createCustomer(dto);
    return this.createCheckoutSession(priceId, newCustomer, purchaseType, dto.userId);
  }

  private async createCheckoutSession(
    priceId: string,
    customer: string,
    purchaseType: 'subscription' | 'extra_device',
    userId: string,
  ): Promise<CheckoutSession> {
    const isExtraDevice = purchaseType === 'extra_device';
    try {
      return await this.stripe.checkout.sessions.create({
        customer,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isExtraDevice ? 'payment' : 'subscription',
        metadata: { purpose: purchaseType, userId },
        success_url: process.env.APP_RETURN_URL || 'https://t.me/your_bot_username',
        cancel_url: process.env.APP_RETURN_URL || 'https://t.me/your_bot_username',
        phone_number_collection: { enabled: false },
      });
    } catch (error) {
      this.logger.error('Error creating Stripe session', error);
      throw error;
    }
  }

  async createPortalSession(customer: string): Promise<BillingPortalSession> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer,
        return_url: process.env.APP_RETURN_URL || 'https://t.me/your_bot_username',
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

  private async createCustomer(dto: CreateStripePaymentDto): Promise<string> {
    // Always stamp the remnawave userId (uuid) onto the customer so the webhook
    // can resolve the user without relying on email/telegramId.
    const newCustomer = await this.stripe.customers.create({
      email: dto.metadata.email,
      metadata: { ...dto.metadata, userId: dto.userId },
    });
    return newCustomer.id;
  }

  /**
   * Reports whether `userId` has an active/trialing Stripe subscription and,
   * if so, returns a fresh Billing Portal URL for self-service management.
   */
  async getSubscriptionStatus(userId: string): Promise<StripeSubscriptionStatusDto> {
    const customerId = await this.getCustomerId(userId);
    if (!customerId) return { active: false, portalUrl: null };

    const active = await this.hasActiveSubscription(customerId);
    if (!active) return { active: false, portalUrl: null };

    try {
      const portal = await this.createPortalSession(customerId);
      return { active: true, portalUrl: portal.url };
    } catch (error) {
      this.logger.error(`Failed to create portal session for customer ${customerId}`, error);
      return { active: true, portalUrl: null };
    }
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

  private getPriceId(purchaseType: 'subscription' | 'extra_device' = 'subscription'): string {
    if (purchaseType === 'extra_device') {
      const priceId = process.env.STRIPE_EXTRA_DEVICE_PRICE_ID || '';
      if (!priceId) {
        this.logger.error('STRIPE_EXTRA_DEVICE_PRICE_ID is not configured');
        throw new Error('Extra device price configuration missing');
      }
      return priceId;
    }
    const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || '';
    if (!priceId) {
      throw new Error('Subscription price configuration missing');
    }
    return priceId;
  }
}
