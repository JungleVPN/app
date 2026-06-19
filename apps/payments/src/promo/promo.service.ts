import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Promo, PromoRedemption } from '@workspace/database';
import type {
  PromoContext,
  PromoEffect,
  PromoProvider,
  ValidatePromoDto,
  ValidatePromoResponse,
} from '@workspace/types';
import { DataSource, Repository } from 'typeorm';
import { bonusMonthsFromEffect } from './promo.applier';

/** Thrown by `resolve` when a code cannot be used; `reason` is user-facing. */
export class PromoInvalidError extends Error {}

@Injectable()
export class PromoService {
  private readonly logger = new Logger(PromoService.name);

  constructor(
    @InjectRepository(Promo)
    private readonly promoRepo: Repository<Promo>,
    @InjectRepository(PromoRedemption)
    private readonly redemptionRepo: Repository<PromoRedemption>,
    private readonly dataSource: DataSource,
  ) {}

  private static normalize(code: string): string {
    return code.trim().toUpperCase();
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
      throw new PromoInvalidError('This promo code is not valid.');
    }

    const now = new Date();
    if (promo.startsAt && now < promo.startsAt) {
      throw new PromoInvalidError('This promo code is not active yet.');
    }
    if (promo.endsAt && now > promo.endsAt) {
      throw new PromoInvalidError('This promo code has expired.');
    }

    if (promo.eligibility === 'expired_only' && ctx.userStatus !== 'EXPIRED') {
      throw new PromoInvalidError('This promo code is only for expired subscriptions.');
    }

    if (promo.maxRedemptions !== null) {
      const total = await this.redemptionRepo.countBy({ promoCode: normalized });
      if (total >= promo.maxRedemptions) {
        throw new PromoInvalidError('This promo code has reached its limit.');
      }
    }

    const usedByUser = await this.redemptionRepo.countBy({
      promoCode: normalized,
      userId: ctx.userId,
    });
    if (usedByUser >= promo.perUserLimit) {
      throw new PromoInvalidError('You have already used this promo code.');
    }

    return promo.effect;
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
        return { valid: false, reason: err.message };
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
    months: number,
    redemption: { userId: string; provider: PromoProvider; paymentId: string },
  ): Promise<number> {
    if (!code) return months;
    const normalized = PromoService.normalize(code);

    return this.dataSource.transaction(async (manager) => {
      const redemptions = manager.getRepository(PromoRedemption);

      const existing = await redemptions.findOneBy({
        provider: redemption.provider,
        paymentId: redemption.paymentId,
      });
      if (existing) {
        // Already applied for this payment — don't grant twice.
        return months;
      }

      const promo = await manager.getRepository(Promo).findOneBy({ code: normalized });
      if (!promo?.active) {
        this.logger.warn(`Promo ${normalized} on payment ${redemption.paymentId} not grantable`);
        return months;
      }

      const now = new Date();
      if ((promo.startsAt && now < promo.startsAt) || (promo.endsAt && now > promo.endsAt)) {
        this.logger.warn(`Promo ${normalized} outside window at fulfillment — no bonus`);
        return months;
      }

      const usedByUser = await redemptions.countBy({
        promoCode: normalized,
        userId: redemption.userId,
      });
      if (usedByUser >= promo.perUserLimit) return months;

      if (promo.maxRedemptions !== null) {
        const total = await redemptions.countBy({ promoCode: normalized });
        if (total >= promo.maxRedemptions) return months;
      }

      const bonus = bonusMonthsFromEffect(promo.effect);

      await redemptions.insert({
        promoCode: normalized,
        userId: redemption.userId,
        provider: redemption.provider,
        paymentId: redemption.paymentId,
      });

      this.logger.log(
        `Promo ${normalized} redeemed by ${redemption.userId} on ${redemption.provider} ` +
          `payment ${redemption.paymentId}: +${bonus} month(s)`,
      );

      return months + bonus;
    });
  }
}
