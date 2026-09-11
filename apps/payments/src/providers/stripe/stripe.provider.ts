import * as process from 'node:process';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { getExtraDevicePrice, getPriceForPeriod } from '@payments/utils/amount';
import { resolveReturnUrl } from '@payments/utils/return-origin';
import { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import {
  CreateStripeSessionDto,
  type PaymentPurpose,
  StripeSubscriptionStatusDto,
} from '@workspace/types';
import type Stripe from 'stripe';
import { In, Repository } from 'typeorm';
import type { BillingPortalSession, CheckoutSession } from './stripe.types';
import { isCheckoutSession, type Session } from './stripe.types';
import { StripeClientService } from './stripe-client.service';
import { StripeWebhookService } from './stripe-webhook.service';

const SUBSCRIPTION_RETURN_PATH = '/profile/subscription';

/** The subscription statuses that count as "this customer is currently subscribed". */
const LIVE_SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
] as const satisfies readonly Stripe.SubscriptionListParams.Status[];

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

  async createPayment(dto: CreateStripeSessionDto, origin?: string) {
    const purchaseType = dto.purchaseType ?? 'subscription';
    const priceId = this.getPriceId(purchaseType, dto.selectedPeriod);
    const customerId = await this.resolveCustomerId(dto);

    const isFirstEverPayment = await this.isFirstEverPayment(dto.userId, customerId);

    const toltReferralId =
      purchaseType === 'subscription' && isFirstEverPayment ? dto.toltReferralId : null;

    if (customerId) {
      if (purchaseType === 'subscription') {
        const hasActiveSubscription = await this.hasActiveSubscription(customerId);
        if (hasActiveSubscription) {
          return this.createPortalSession(customerId, origin);
        }
      }
      return await this.createCheckoutSession(
        priceId,
        customerId,
        purchaseType,
        dto.userId,
        toltReferralId,
        origin,
      );
    }

    const newCustomer = await this.createCustomer(dto);
    return await this.createCheckoutSession(
      priceId,
      newCustomer,
      purchaseType,
      dto.userId,
      toltReferralId,
      origin,
    );
  }

  /**
   * The Stripe customer to bill.
   *
   * An anonymous checkout has no account yet, so there are no payment rows to
   * read a customer id off — Stripe itself is asked by email instead, which is
   * what stops a returning payer being given a second customer record (and with
   * it a second subscription against the same address).
   */
  private async resolveCustomerId(dto: CreateStripeSessionDto): Promise<string | null> {
    if (dto.userId != null) return this.getCustomerId(dto.userId);

    const email = dto.metadata?.email;
    if (!email) return null;

    const customer = await this.stripeClientService.findCustomerByEmail(email);
    if (!customer) return null;

    await this.backfillCheckoutMetadata(customer, dto.metadata);
    return customer.id;
  }

  /**
   * Fills in the checkout metadata a reused Stripe customer is missing.
   *
   * `createCustomer` is the only other place this metadata is written, so a
   * payer whose earlier attempt already minted a customer — the visitor who
   * opened the page, walked away, then came back through a `?ref=` link and
   * paid — had this attempt's `inviterId` and `signupOrigin` silently dropped.
   * The webhook reads both off the customer to create the account once the
   * charge settles, so losing them costs the referral its reward and leaves a
   * global payer in the RU squad, `isGlobalOrigin(null)` being false.
   *
   * Only absent keys are written: an attribution already on file is the earlier
   * touch and keeps its claim. Once `userId` is stamped the account exists and
   * the webhook never reads these again, so there is nothing to back-fill.
   */
  private async backfillCheckoutMetadata(
    customer: Stripe.Customer,
    metadata: Record<string, string>,
  ): Promise<void> {
    if (customer.metadata?.userId) return;

    const missing = Object.fromEntries(
      Object.entries(metadata).filter(([key, value]) => value && !customer.metadata?.[key]),
    );
    if (Object.keys(missing).length === 0) return;

    // Best-effort: losing the referral is bad, losing the sale is worse. The
    // next attempt back-fills the same keys again.
    try {
      await this.stripe.customers.update(customer.id, { metadata: missing });
    } catch (error) {
      this.logger.error(
        `Failed to back-fill checkout metadata onto Stripe customer ${customer.id}`,
        error,
      );
    }
  }

  /** The Stripe customer already on file for an email, or null. */
  async findCustomerIdByEmail(email: string): Promise<string | undefined> {
    const customer = await this.stripeClientService.findCustomerByEmail(email);
    return customer?.id;
  }

  /**
   * Opens a Stripe session and records the sale. Shared by the authenticated
   * and public routes so both stay identical in pricing, persistence and
   * analytics — only how the payer is identified differs.
   */
  async openSession(dto: CreateStripeSessionDto, origin?: string): Promise<Session> {
    const { userId, selectedPeriod } = dto;
    const purpose = dto.purchaseType ?? 'subscription';

    const amount = this.resolveAmount(purpose, selectedPeriod);

    const session = await this.createPayment(dto, origin);

    // A subscriber sent to the Billing Portal has bought nothing: recording a
    // pending sale for it would leave a row no webhook ever settles, and would
    // report a checkout that never started.
    if (!isCheckoutSession(session)) return session;

    const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    const record = this.repository.create({
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
    await this.repository.save(record);

    await this.analyticsClient.track({
      event: 'checkout_started',
      userId,
      email: dto.metadata?.email ?? null,
      provider: 'stripe',
      purpose,
      amount,
      currency: 'EUR',
    });

    return session;
  }

  resolveAmount(purpose: PaymentPurpose, selectedPeriod: number): string {
    try {
      return purpose === 'extra_device'
        ? getExtraDevicePrice('EUR')
        : getPriceForPeriod('EUR', selectedPeriod);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * Whether this payer has never successfully paid before — the only case a
   * Tolt referral may be attributed, since the commission is for a new customer.
   *
   * An anonymous checkout has no userId to read a payment history off, so the
   * history is taken from the Stripe customer the payer's email resolved to.
   * Treating "no userId" as "new payer" would pay the commission again every
   * time a lapsed subscriber came back through a `?ref=` link.
   */
  private async isFirstEverPayment(
    userId: number | null,
    customerId: string | null,
  ): Promise<boolean> {
    if (userId != null) return !(await this.hasPriorSuccessfulPayment({ userId }));

    // No customer for this email means Stripe has never billed it: nothing to
    // have paid with, so the sale genuinely is the payer's first.
    if (!customerId) return true;

    return !(await this.hasPriorSuccessfulPayment({ customer: customerId }));
  }

  /**
   * Whether this payer has any prior successful payment.
   *
   * The two identities read the same history by different keys. A known account
   * is checked across all three providers. An anonymous payer has no userId to
   * key on — only the Stripe customer their email resolved to — and the
   * YooKassa/Stars histories are keyed by a userId, so Stripe is all there is
   * to consult.
   */
  private async hasPriorSuccessfulPayment(
    identity: { userId: number } | { customer: string },
  ): Promise<boolean> {
    if ('customer' in identity) {
      return this.repository.exists({
        where: { customer: identity.customer, status: In(['paid', 'completed']) },
      });
    }

    const { userId } = identity;
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
    userId: number | null,
    toltReferralId?: string | null,
    origin?: string,
  ): Promise<CheckoutSession> {
    const isExtraDevice = purchaseType === 'extra_device';
    const metadata = {
      userId: userId || null,
      purpose: purchaseType,
      tolt_referral: toltReferralId || null,
    };
    const returnUrl = resolveReturnUrl(origin, SUBSCRIPTION_RETURN_PATH);

    try {
      return await this.stripe.checkout.sessions.create({
        customer,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isExtraDevice ? 'payment' : 'subscription',
        metadata,
        ...(!isExtraDevice && { subscription_data: { metadata } }),
        allow_promotion_codes: true,
        success_url: returnUrl,
        cancel_url: returnUrl,
        phone_number_collection: { enabled: false },
      });
    } catch (error) {
      this.logger.error('Error creating Stripe session', error);
      throw error;
    }
  }

  async createPortalSession(customer: string, origin?: string): Promise<BillingPortalSession> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer,
        return_url: resolveReturnUrl(origin, SUBSCRIPTION_RETURN_PATH),
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
    const newCustomer = await this.stripe.customers.create({
      email: dto.metadata.email,
      metadata: { ...dto.metadata, ...(dto.userId != null && { userId: dto.userId }) },
    });
    return newCustomer.id;
  }

  /**
   * Reports whether `userId` has an active/trialing Stripe subscription and,
   * if so, returns a fresh Billing Portal URL for self-service management.
   */
  async getSubscriptionStatus(
    userId: number,
    origin?: string,
  ): Promise<StripeSubscriptionStatusDto> {
    const customerId = await this.getCustomerId(userId);
    if (!customerId) return { active: false, portalUrl: null };

    const active = await this.hasActiveSubscription(customerId);
    if (!active) return { active: false, portalUrl: null };

    try {
      const portal = await this.createPortalSession(customerId, origin);
      return { active: true, portalUrl: portal.url };
    } catch (error) {
      this.logger.error(`Failed to create portal session for customer ${customerId}`, error);
      return { active: true, portalUrl: null };
    }
  }

  async getCustomerId(userId: number): Promise<string | null> {
    const lastPayment = await this.repository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return lastPayment?.customer || null;
  }

  async hasActiveSubscription(customerId: string): Promise<boolean> {
    try {
      // Ask Stripe for each live status directly rather than filtering an
      // unfiltered listing. `status: 'all'` returns every subscription the
      // customer has ever had — cancellations are kept forever — against a
      // default page size of 10, so a customer who has churned and resubscribed
      // enough times pushes their live subscription off the only page we read,
      // and the answer silently flips to "not subscribed". One row per status is
      // all this question needs, and it cannot be thrown off by page ordering.
      const pages = await Promise.all(
        LIVE_SUBSCRIPTION_STATUSES.map((status) =>
          this.stripe.subscriptions.list({ customer: customerId, status, limit: 1 }),
        ),
      );

      return pages.some((page) => page.data.length > 0);
    } catch (error) {
      this.logger.error(`Error checking subscription for customer ${customerId}`, error);
      throw error;
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
