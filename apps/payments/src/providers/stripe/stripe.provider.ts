import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import { CreateStripeSessionDto, StripeSubscriptionStatusDto } from '@workspace/types';
import type Stripe from 'stripe';
import { In, Repository } from 'typeorm';
import type { BillingPortalSession, CheckoutSession } from './stripe.types';
import { StripeClientService } from './stripe-client.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Injectable()
export class StripeProvider {
  readonly stripe: Stripe;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(
    readonly stripeWebhookService: StripeWebhookService,
    readonly stripeClientService: StripeClientService,
    @InjectRepository(StripePayment) private repository: Repository<StripePayment>,
    @InjectRepository(YookassaPayment) private yookassaRepository: Repository<YookassaPayment>,
    @InjectRepository(TelegramStarsPayment)
    private telegramStarsRepository: Repository<TelegramStarsPayment>,
    private readonly analyticsClient: AnalyticsClientService,
  ) {
    this.stripe = stripeClientService.stripe;
  }

  async handleWebhook(payload: Stripe.Event) {
    await this.stripeWebhookService.handleWebhook(payload);
  }

  async createPayment(dto: CreateStripeSessionDto) {
    const purchaseType = dto.purchaseType ?? 'subscription';
    const priceId = this.getPriceId(purchaseType, dto.selectedPeriod);
    const customerId = await this.getCustomerId(dto.userId);

    // Only ever attribute the referral on a user's first-ever successful payment
    const toltReferralId =
      purchaseType === 'subscription' && !(await this.hasPriorSuccessfulPayment(dto.userId))
        ? dto.toltReferralId
        : null;

    if (customerId) {
      // Only redirect to billing portal for subscription renewals, never for extra-device.
      if (purchaseType === 'subscription') {
        const hasActiveSubscription = await this.hasActiveSubscription(customerId);
        if (hasActiveSubscription) {
          return this.createPortalSession(customerId);
        }
      }
      return await this.createCheckoutSession(
        priceId,
        customerId,
        purchaseType,
        dto.userId,
        toltReferralId,
      );
    }

    const newCustomer = await this.createCustomer(dto);
    return await this.createCheckoutSession(
      priceId,
      newCustomer,
      purchaseType,
      dto.userId,
      toltReferralId,
    );
  }

  /** Whether `userId` has any prior successful payment, across all payment providers. */
  private async hasPriorSuccessfulPayment(userId: string): Promise<boolean> {
    const [stripePayment, yookassaPayment, starsPayment] = await Promise.all([
      this.repository.exists({ where: { userId, status: In(['paid', 'completed']) } }),
      this.yookassaRepository.exists({ where: { userId, status: 'succeeded' } }),
      this.telegramStarsRepository.exists({ where: { userId, status: 'succeeded' } }),
    ]);
    return stripePayment || yookassaPayment || starsPayment;
  }

  private async createCheckoutSession(
    priceId: string,
    customer: string,
    purchaseType: 'subscription' | 'extra_device',
    userId: string,
    toltReferralId?: string | null,
  ): Promise<CheckoutSession> {
    const isExtraDevice = purchaseType === 'extra_device';
    const metadata = {
      userId: userId || null,
      purpose: purchaseType,
      tolt_referral: toltReferralId || null,
    };

    try {
      return await this.stripe.checkout.sessions.create({
        customer,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isExtraDevice ? 'payment' : 'subscription',
        metadata,
        ...(!isExtraDevice && { subscription_data: { metadata } }),
        allow_promotion_codes: true,
        success_url: process.env.RETURN_URL_WEB || 'https://jungle-vpn.com/profile/subscription',
        cancel_url: process.env.RETURN_URL_WEB || 'https://jungle-vpn.com/profile/subscription',
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
        return_url: process.env.RETURN_URL_WEB || 'https://jungle-vpn.com/profile/subscription',
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

  private async createCustomer(dto: CreateStripeSessionDto): Promise<string> {
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

  private getPriceId(
    purchaseType: 'subscription' | 'extra_device' = 'subscription',
    selectedPeriod?: number,
  ): string {
    if (purchaseType === 'extra_device') {
      const priceId = process.env.STRIPE_EXTRA_DEVICE_PRICE_ID;
      if (!priceId) {
        throw new Error('Extra device price configuration missing');
      }
      return priceId;
    }
    // No fallback to the monthly price: a period whose id is missing would
    // otherwise be sold as a one-month subscription, and nothing downstream
    // could tell — the invoice would map cleanly back to 1 month and the user
    // would sit on a monthly cycle believing they bought a longer plan.
    // An absent period still means the shortest plan; only a period that was
    // asked for and has no price is a misconfiguration.
    const months = selectedPeriod || 1;
    const priceId = process.env[`STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_${months}`];
    if (!priceId) {
      throw new Error(
        `Subscription price configuration missing: STRIPE_SUBSCRIPTION_PRICE_ID_MONTH_${months} is not set for a ${months} month plan`,
      );
    }
    return priceId;
  }
}
