import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminService } from '@payments/admin/admin.service';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { Promo, PromoRedemption } from '@workspace/database';
import type {
  PaymentMethod,
  PromoContext,
  PromoEffect,
  PromoErrorCode,
  PublicPromoDto,
  UserScope,
  ValidatePromoDto,
  ValidatePromoResponse,
} from '@workspace/types';
import { DataSource, In, Repository } from 'typeorm';
import { bonusMonthsFromEffect } from './promo.applier';

/** Thrown by `resolve` when a code cannot be used; `code` localizes on the client. */
export class PromoInvalidError extends Error {
  constructor(
    message: string,
    readonly code: PromoErrorCode,
  ) {
    super(message);
  }
}

@Injectable()
export class PromoService {
  private readonly logger = new Logger(PromoService.name);

  constructor(
    @InjectRepository(Promo)
    private readonly promoRepo: Repository<Promo>,
    @InjectRepository(PromoRedemption)
    private readonly redemptionRepo: Repository<PromoRedemption>,
    private readonly dataSource: DataSource,
    private readonly adminService: AdminService,
    private readonly analyticsClient: AnalyticsClientService,
  ) {}

  private static normalize(code: string): string {
    return code.trim().toUpperCase();
  }

  /** Whether `promo` applies to a plan of `period` days. */
  private static coversPeriod(promo: Promo, period: number): boolean {
    return promo.planPeriods === null || promo.planPeriods.includes(period);
  }

  /**
   * Whether `userId` has ever settled a subscription payment, across every provider.
   * Checked against payment history rather than current subscription/saved-method
   * state, so deleting a saved payment method or letting a subscription expire
   * never makes a returning user look new again. Extra-device purchases don't
   * count — a trial user can buy a device slot without ever paying for a plan.
   */
  private async hasEverPaid(userId: number): Promise<boolean> {
    const payments = await this.adminService.search(String(userId));
    return payments.some(
      (payment) =>
        payment.userId === userId && payment.purpose === 'subscription' && !!payment.paidAt,
    );
  }

  /**
   * Validate a code against the current state and context.
   * Returns the effect that would apply, or throws PromoInvalidError.
   *
   * Used both by the live /promo/validate endpoint and at checkout. The
   * authoritative cap is still enforced at redemption time (see applyToMonths).
   */
  async resolve(code: string, ctx: PromoContext): Promise<PromoEffect> {
    const normalized = PromoService.normalize(code);
    const promo = await this.promoRepo.findOneBy({ code: normalized });

    if (!promo?.active) {
      throw new PromoInvalidError('This promo code is not valid.', 'invalid');
    }

    const now = new Date();
    if (promo.startsAt && now < promo.startsAt) {
      throw new PromoInvalidError('This promo code is not active yet.', 'not_active_yet');
    }
    if (promo.endsAt && now > promo.endsAt) {
      throw new PromoInvalidError('This promo code has expired.', 'expired');
    }

    if (promo.effect.type !== 'bonus_months') {
      throw new PromoInvalidError('This promo code cannot be used here.', 'unsupported_effect');
    }

    if (ctx.selectedPeriod !== undefined && !PromoService.coversPeriod(promo, ctx.selectedPeriod)) {
      throw new PromoInvalidError('This promo code does not apply to this plan.', 'not_for_plan');
    }

    if (promo.eligibility === 'expired_only' && ctx.userStatus !== 'EXPIRED') {
      throw new PromoInvalidError(
        'This promo code is only for expired subscriptions.',
        'not_eligible',
      );
    }

    if (promo.eligibility === 'new' && (await this.hasEverPaid(ctx.userId))) {
      throw new PromoInvalidError('This promo code is only for new users.', 'not_new_user');
    }

    if (promo.maxRedemptions !== null) {
      const total = await this.redemptionRepo.countBy({ promoCode: normalized });
      if (total >= promo.maxRedemptions) {
        throw new PromoInvalidError('This promo code has reached its limit.', 'limit_reached');
      }
    }

    const usedByUser = await this.redemptionRepo.countBy({
      promoCode: normalized,
      userId: ctx.userId,
    });
    if (usedByUser >= promo.perUserLimit) {
      throw new PromoInvalidError('You have already used this promo code.', 'already_used');
    }

    return promo.effect;
  }

  async findByCode(code: string): Promise<Promo | null> {
    return this.promoRepo.findOneBy({ code: PromoService.normalize(code) });
  }

  private async hasRedemptionsLeft(promo: Promo): Promise<boolean> {
    if (promo.maxRedemptions === null) return true;
    const total = await this.redemptionRepo.countBy({ promoCode: promo.code });
    return total < promo.maxRedemptions;
  }

  private static toPublic(promo: Promo): PublicPromoDto {
    return {
      code: promo.code,
      effect: promo.effect,
      eligibility: promo.eligibility,
      duration: promo.duration,
      durationMonths: promo.durationMonths,
      endsAt: promo.endsAt?.toISOString() ?? null,
      perUserLimit: promo.perUserLimit,
      planPeriods: promo.planPeriods,
    };
  }

  /**
   * The promos a storefront offers right now (its own and `all`-scoped ones),
   * newest first — those an anonymous payer could still use. `expired_only`
   * promos are left out, since the payer's subscription status is unknown there. `featured` narrows the list when given.
   */
  async listAvailable({
    scope,
    featured,
  }: {
    scope: UserScope;
    featured?: boolean;
  }): Promise<PublicPromoDto[]> {
    const candidates = await this.promoRepo.find({
      where: {
        scope: In([scope, 'all']),
        active: true,
        ...(featured === undefined ? {} : { featured }),
      },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const showable = candidates.filter(
      (promo) =>
        promo.eligibility !== 'expired_only' &&
        (!promo.startsAt || promo.startsAt <= now) &&
        (!promo.endsAt || now <= promo.endsAt),
    );

    const hasRoom = await Promise.all(showable.map((promo) => this.hasRedemptionsLeft(promo)));
    return showable.filter((_, index) => hasRoom[index]).map(PromoService.toPublic);
  }

  /** Non-throwing wrapper for the validation endpoint. */
  async validate(dto: ValidatePromoDto): Promise<ValidatePromoResponse> {
    try {
      const effect = await this.resolve(dto.code, {
        userId: dto.userId,
        userStatus: dto.userStatus,
        selectedPeriod: dto.selectedPeriod,
      });
      return { valid: true, effect };
    } catch (err) {
      if (err instanceof PromoInvalidError) {
        await this.analyticsClient.track({
          event: 'promo_code_rejected',
          userId: dto.userId,
          code: PromoService.normalize(dto.code),
          reason: err.code,
        });
        return { valid: false, reason: err.message, code: err.code };
      }
      throw err;
    }
  }

  /**
   * Apply a promo at fulfillment and return the total months to grant.
   *
   * Idempotent and cap-safe: keyed on (provider, paymentId) so a retried webhook
   * never double-grants, and the per-user / global caps are re-checked inside the
   * transaction. Returns `months` unchanged when there is no code or the code is
   * no longer grantable — the payment itself always succeeds.
   */
  async applyToMonths(
    code: string | null | undefined,
    days: number,
    redemption: { userId: number; provider: PaymentMethod; paymentId: string },
  ): Promise<number> {
    if (!code) return days;
    const normalized = PromoService.normalize(code);

    return this.dataSource.transaction(async (manager) => {
      const redemptions = manager.getRepository(PromoRedemption);

      const existing = await redemptions.findOneBy({
        provider: redemption.provider,
        paymentId: redemption.paymentId,
      });
      if (existing) {
        // Already applied for this payment — don't grant twice.
        return days;
      }

      const promo = await manager.getRepository(Promo).findOneBy({ code: normalized });
      if (!promo?.active) {
        this.logger.warn(`Promo ${normalized} on payment ${redemption.paymentId} not grantable`);
        return days;
      }

      const now = new Date();
      if ((promo.startsAt && now < promo.startsAt) || (promo.endsAt && now > promo.endsAt)) {
        this.logger.warn(`Promo ${normalized} outside window at fulfillment — no bonus`);
        return days;
      }

      if (promo.effect.type !== 'bonus_months' || !PromoService.coversPeriod(promo, days)) {
        this.logger.warn(`Promo ${normalized} grants no bonus on a ${days}-day plan`);
        return days;
      }

      const usedByUser = await redemptions.countBy({
        promoCode: normalized,
        userId: redemption.userId,
      });
      if (usedByUser >= promo.perUserLimit) return days;

      if (promo.maxRedemptions !== null) {
        const total = await redemptions.countBy({ promoCode: normalized });
        if (total >= promo.maxRedemptions) return days;
      }

      const bonus = bonusMonthsFromEffect(promo.effect);

      await redemptions.insert({
        promoCode: normalized,
        userId: redemption.userId,
        provider: redemption.provider,
        paymentId: redemption.paymentId,
      });

      await this.analyticsClient.track({
        event: 'promo_code_applied',
        userId: redemption.userId,
        code: normalized,
        provider: redemption.provider,
      });

      this.logger.log(
        `Promo ${normalized} redeemed by ${redemption.userId} on ${redemption.provider} ` +
          `payment ${redemption.paymentId}: +${bonus} days(s)`,
      );

      return days + bonus;
    });
  }
}
