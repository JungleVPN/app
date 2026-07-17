import * as process from 'node:process';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import type { StripeSubscriptionStatusDto } from '@workspace/types';
import type Stripe from 'stripe';
import { In, Repository } from 'typeorm';
import { PromoInvalidError, PromoService } from '../../promo/promo.service';
import { StripeClientService } from './stripe-client.service';
import type { BillingPortalSession, CheckoutSession, CreateStripePaymentDto } from './stripe.types';
import { StripeWebhookService } from './stripe-webhook.service';

@Injectable()
export class StripeProvider {
  readonly stripe: Stripe;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(
    private readonly stripeClient: StripeClientService,
    readonly stripeWebhookService: StripeWebhookService,
    @InjectRepository(StripePayment) private repository: Repository<StripePayment>,
    @InjectRepository(YookassaPayment) private yookassaRepository: Repository<YookassaPayment>,
    @InjectRepository(TelegramStarsPayment)
    private telegramStarsRepository: Repository<TelegramStarsPayment>,
    private readonly promoService: PromoService,
  ) {
    this.stripe = stripeClient.stripe;
  }

  async handleWebhook(payload: Stripe.Event) {
    await this.stripeWebhookService.handleWebhook(payload);
  }

  async createPayment(dto: CreateStripePaymentDto) {
    const purchaseType = dto.purchaseType ?? 'subscription';
    const priceId = this.getPriceId(purchaseType);
    const customerId = await this.getCustomerId(dto.userId);

    // Validate any promo up front so the user gets immediate feedback. Only
    // subscription payments carry promos; the binding check is at fulfillment.
    const promoCode =
      purchaseType === 'subscription' && dto.promoCode
        ? await this.validatePromoOrThrow(dto.promoCode, {
            userId: dto.userId,
            userStatus: dto.userStatus,
          })
        : null;

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
      return this.createCheckoutSession(
        priceId,
        customerId,
        purchaseType,
        dto.userId,
        promoCode,
        toltReferralId,
      );
    }

    const newCustomer = await this.createCustomer(dto);
    return this.createCheckoutSession(
      priceId,
      newCustomer,
      purchaseType,
      dto.userId,
      promoCode,
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

  /** Validate a promo code at checkout; returns the normalized code or throws 400. */
  private async validatePromoOrThrow(
    code: string,
    ctx: { userId: string; userStatus?: string },
  ): Promise<string> {
    try {
      await this.promoService.resolve(code, ctx);
      return code.trim().toUpperCase();
    } catch (err) {
      if (err instanceof PromoInvalidError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  private async createCheckoutSession(
    priceId: string,
    customer: string,
    purchaseType: 'subscription' | 'extra_device',
    userId: string,
    promoCode: string | null = null,
    toltReferralId?: string | null,
  ): Promise<CheckoutSession> {
    const isExtraDevice = purchaseType === 'extra_device';
    const subscriptionMetadata = {
      ...(promoCode ? { promoCode } : {}),
      ...(toltReferralId ? { tolt_referral: toltReferralId } : {}),
    };
    try {
      return await this.stripe.checkout.sessions.create({
        customer,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isExtraDevice ? 'payment' : 'subscription',
        metadata: {
          purpose: purchaseType,
          userId,
          ...(toltReferralId ? { tolt_referral: toltReferralId } : {}),
        },
        // Stamp the promo/Tolt referral onto the subscription so they reach every
        // invoice's `subscription_details.metadata` — the carrier read at fulfillment
        // (and what Tolt reads to attribute recurring revenue).
        ...(!isExtraDevice && Object.keys(subscriptionMetadata).length > 0
          ? { subscription_data: { metadata: subscriptionMetadata } }
          : {}),
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
