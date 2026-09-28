import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanService } from '@payments/catalog/plan.service';
import { VisitorCurrencyService } from '@payments/catalog/visitor-currency.service';
import { toSavedMethodDto } from '@payments/utils/saved-method';
import { SavedPaymentMethod } from '@workspace/database';
import {
  PROMO_CODE_INVALID_CODE,
  type ProviderSubscriptionDto,
  type WhopCancelDto,
  type WhopCheckoutPayload,
  type WhopPaymentDto,
  type WhopPromoCodeDto,
} from '@workspace/types';
import { Repository } from 'typeorm';
import { WhopClientService } from './whop-client.service';
import { WhopWebhookService } from './whop-webhook.service';

@Injectable()
export class WhopProvider {
  constructor(
    private readonly whopClientService: WhopClientService,
    private readonly whopWebhookService: WhopWebhookService,
    private readonly planService: PlanService,
    private readonly visitorCurrencyService: VisitorCurrencyService,
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepository: Repository<SavedPaymentMethod>,
  ) {}

  /** Takes the signature-verified webhook body; the webhook service validates its shape. */
  async handleWebhook(event: unknown): Promise<void> {
    await this.whopWebhookService.handleWebhook(event);
  }

  async hasActiveSubscription(email: string): Promise<boolean> {
    return this.whopClientService.hasActiveSubscription(email);
  }

  /**
   * The Whop plan (`plan_...`) to bill for our `planId`, in the currency the
   * payer at `clientIp` was priced in, refusing a plan that is not on sale.
   * Kept apart from `createCheckout` so a request can be rejected before
   * anything is created on Whop.
   */
  async resolveCheckoutPlanId(planId: string, clientIp: string | null): Promise<string> {
    const { currency } = await this.visitorCurrencyService.resolve({ provider: 'whop', clientIp });
    const plan = await this.planService.getForCheckout(planId, 'whop', currency);
    if (!plan.providerPriceId) {
      throw new Error('No Whop plan id was found in resolveCheckoutPlanId');
    }
    return plan.providerPriceId;
  }

  /**
   * What the browser mounts the card form against: our account, the Whop plan
   * being bought, and whether it renews — a wallet token for a renewing plan
   * must be minted for off-session reuse, or Whop refuses it.
   */
  async checkoutTarget(whopPlanId: string): Promise<WhopCheckoutPayload> {
    const plan = await this.planService.findByProviderPriceId('whop', whopPlanId);
    return {
      accountId: this.whopClientService.accountId,
      planId: whopPlanId,
      renews: plan?.type === 'recurring',
    };
  }

  /**
   * Charges the card the browser tokenised, stamped with the metadata a later
   * webhook needs to identify the payer once the payment settles
   */
  async payCheckout(input: {
    email: string;
    whopPlanId: string;
    confirmationToken: string;
    returnUrl: string;
    toltReferralId?: string | null;
    inviterId?: number;
    origin?: string;
    promoCode?: string;
  }): Promise<WhopPaymentDto> {
    const metadata: Record<string, string> = { email: input.email };
    if (input.toltReferralId) metadata.toltReferralId = input.toltReferralId;
    if (input.inviterId != null) metadata.inviterId = String(input.inviterId);
    if (input.origin) metadata.signupOrigin = input.origin;

    const promo = input.promoCode
      ? await this.findPromoCodeOrRefuse(input.promoCode, input.whopPlanId)
      : null;

    return this.whopClientService.createPayment({
      planId: input.whopPlanId,
      confirmationToken: input.confirmationToken,
      email: input.email,
      metadata,
      returnUrl: input.returnUrl,
      ...(promo ? { promoCodeId: promo.id } : {}),
    });
  }

  /** The discount `promoCode` gives `whopPlanId`, refusing a code the plan does not offer. */
  async checkPromoCode(input: {
    promoCode: string;
    whopPlanId: string;
  }): Promise<WhopPromoCodeDto> {
    const { id: _id, ...discount } = await this.findPromoCodeOrRefuse(
      input.promoCode,
      input.whopPlanId,
    );
    return discount;
  }

  private async findPromoCodeOrRefuse(promoCode: string, whopPlanId: string) {
    const promo = await this.whopClientService.findPromoCode({
      code: promoCode,
      planId: whopPlanId,
    });
    if (!promo) {
      throw new BadRequestException({
        code: PROMO_CODE_INVALID_CODE,
        message: 'This promo code does not apply to the chosen plan',
      });
    }
    return promo;
  }

  /**
   * Whether `userId` is subscribed through Whop, answered from our own
   * `saved_payment_methods` rows rather than Whop's API — mirrors Paddle's
   * `getSubscriptionStatus`, including its reliance on the webhooks that keep
   * those rows true.
   */
  async getSubscriptionStatus(userId: number): Promise<ProviderSubscriptionDto> {
    const methods = await this.findActiveMethods(userId);
    return { active: methods.length > 0, methods: methods.map(toSavedMethodDto) };
  }

  /**
   * Cancels `userId`'s Whop membership at period end. Takes the place of
   * Paddle's `getPortalUrl`: Whop has no per-customer portal to send the user
   * to, so the one self-service action is done here, on the user's behalf.
   */
  async cancelSubscription(userId: number): Promise<WhopCancelDto> {
    const [latest] = await this.findActiveMethods(userId);
    if (!latest) {
      throw new NotFoundException('No active Whop subscription to cancel');
    }
    return this.whopClientService.cancelMembership(latest.paymentMethodId);
  }

  private findActiveMethods(userId: number): Promise<SavedPaymentMethod[]> {
    return this.savedMethodRepository.find({
      where: { userId, provider: 'whop', isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
