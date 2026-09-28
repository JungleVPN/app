import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Plan, type PlanProvider } from '@workspace/database';
import type { Repository } from 'typeorm';

/**
 * Reads the `subscription_plans` table. It holds a handful of rows, so every query loads it
 * whole and filters here rather than in SQL — which also keeps a malformed
 * `planId` from ever reaching Postgres.
 */
@Injectable()
export class PlanService {
  constructor(@InjectRepository(Plan) private readonly planRepo: Repository<Plan>) {}

  /** What a visitor can buy from `provider` in `currency` right now, shortest period first. */
  async listForSale(provider: PlanProvider, currency: string): Promise<Plan[]> {
    return (await this.plansOf(provider, currency))
      .filter((row) => row.availableForPurchase)
      .sort((a, b) => a.billingPeriod - b.billingPeriod);
  }

  /** The currencies `provider` has at least one plan on sale in. */
  async currenciesForSale(provider: PlanProvider): Promise<string[]> {
    const onSale = (await this.planRepo.find()).filter(
      (row) => row.provider === provider && row.availableForPurchase,
    );

    return [...new Set(onSale.map((row) => row.currency))];
  }

  /**
   * The plan a checkout is for, on sale at the provider taking the payment,
   * in the currency the payer is charged in.
   *
   * The plan id comes back from the browser, so it may name another
   * currency's plan, or — since the page picks the provider from the user's
   * stored scope and `/plans` from the request origin — the other
   * storefront's. Either way it is charged as the same period at this
   * provider's price in `currency`.
   */
  async getForCheckout(planId: string, provider: PlanProvider, currency: string): Promise<Plan> {
    const requested = (await this.planRepo.find()).find((row) => row.id === planId);
    const plan = (await this.listForSale(provider, currency)).find(
      (row) =>
        row.id === planId ||
        (requested !== undefined &&
          row.type === requested.type &&
          row.billingPeriod === requested.billingPeriod),
    );

    if (!plan) {
      throw new BadRequestException(`Plan ${planId} is not available for purchase`);
    }
    if (provider !== 'yookassa' && !plan.providerPriceId) {
      throw new BadRequestException(`Plan ${planId} has no ${provider} price configured`);
    }

    return plan;
  }

  /**
   * The price to renew an existing subscription at. Prefers the plan on sale
   * for that period, but falls back to a retired one: a subscriber keeps
   * renewing a period after it is taken off sale.
   */
  async findForRenewal(provider: PlanProvider, days: number, currency: string): Promise<Plan> {
    const plan = await this.planForPeriod(provider, days, currency);

    if (!plan) {
      throw new Error(`No ${provider} plan priced in ${currency} for a ${days} day period`);
    }

    return plan;
  }

  /**
   * Whether a paid period was the provider's one-time trial. A period with no
   * plan — an extra device, or a legacy period — is not.
   */
  async isTrial(provider: PlanProvider, days: number, currency: string): Promise<boolean> {
    return (await this.planForPeriod(provider, days, currency))?.type === 'one_time';
  }

  /**
   * The plan a paid amount (major units of `currency`, e.g. 0.99) was for, on
   * sale or not. Throws rather than guess when no plan, or more than one
   * period, matches.
   */
  async findByAmount(provider: PlanProvider, amount: number, currency: string): Promise<Plan> {
    const matches = (await this.plansOf(provider, currency)).filter(
      (row) => row.basePrice === amount,
    );
    const periods = new Set(matches.map((row) => row.billingPeriod));

    if (matches.length === 0) {
      throw new Error(`Unrecognized ${provider} amount: ${amount} ${currency}`);
    }
    if (periods.size > 1) {
      throw new Error(
        `Ambiguous ${provider} amount ${amount} ${currency}: matches periods ${[...periods]}`,
      );
    }

    return matches[0];
  }

  /**
   * The plan billed under a provider's catalog id, on sale or not — how a
   * webhook that only carries that id learns which period was paid for.
   */
  async findByProviderPriceId(
    provider: PlanProvider,
    providerPriceId: string,
  ): Promise<Plan | undefined> {
    return (await this.planRepo.find()).find(
      (row) => row.provider === provider && row.providerPriceId === providerPriceId,
    );
  }

  /** The plan for a period, preferring the one on sale over a retired one. */
  private async planForPeriod(
    provider: PlanProvider,
    days: number,
    currency: string,
  ): Promise<Plan | undefined> {
    const rows = (await this.plansOf(provider, currency)).filter(
      (row) => row.billingPeriod === days,
    );

    return rows.find((row) => row.availableForPurchase) ?? rows[0];
  }

  private async plansOf(provider: PlanProvider, currency: string): Promise<Plan[]> {
    return (await this.planRepo.find()).filter(
      (row) => row.provider === provider && row.currency === currency,
    );
  }
}
