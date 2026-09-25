import { Injectable, Logger } from '@nestjs/common';
import { PlanService } from '@payments/catalog/plan.service';
import { providerCurrency, resolveProvider } from '@payments/catalog/plan-provider';
import { paddleAmountToNumber } from '@payments/providers/paddle/paddle.utils';
import { PaddleClientService } from '@payments/providers/paddle/paddle-client.service';
import { buildPricing } from '@payments/utils/amount';
import type { Plan } from '@workspace/database';
import { type SubscriptionPlanDto } from '@workspace/types';

/** Paddle's quote for one visitor, reduced to what a plan needs from it. */
interface PaddleQuote {
  currencyCode: string;
  countryCode: string | null;
  /** Each quoted period's total, in major units. */
  totalByPeriod: Map<number, number>;
}

@Injectable()
export class CommonService {
  private readonly logger = new Logger(CommonService.name);

  constructor(
    private readonly paddleClientService: PaddleClientService,
    private readonly planService: PlanService,
  ) {}

  /**
   * Every plan on sale, priced in the one currency this visitor will actually
   * be charged in.
   *
   * The storefront the request came from picks the provider (see
   * `resolveProvider`), and the `subscription_plans` table says what that provider sells.
   * Paddle additionally quotes the visitor's local currency from `clientIp`,
   * falling back to the table's EUR price when it can't be reached.
   *
   * The response deliberately names no provider: which one takes the payment
   * is decided again, the same way, when the client starts a checkout.
   */
  async getPlans({
    origin,
    clientIp,
  }: {
    origin: string | null;
    clientIp: string | null;
  }): Promise<SubscriptionPlanDto[]> {
    const provider = resolveProvider(origin);
    const rows = await this.planService.listForSale(provider);

    if (rows.length === 0) {
      this.logger.warn(`No ${provider} plans are available for purchase`);
      return [];
    }

    const plans = toPlans(rows);
    if (provider !== 'paddle') return plans;

    const quote = await this.fetchPaddleQuote(rows, clientIp);
    return quote ? applyPaddleQuote(plans, quote) : plans;
  }

  /**
   * Paddle's quote for every plan, localized to `clientIp` — or null when
   * Paddle couldn't be reached. Not fatal: plans keep their EUR pricing.
   * (`PaddleClientService.getPricePreview` has its own EUR fallback, but that
   * only covers a location Paddle can't price, not Paddle being down.)
   */
  private async fetchPaddleQuote(
    rows: Plan[],
    clientIp: string | null,
  ): Promise<PaddleQuote | null> {
    const priced = rows.filter(
      (row): row is Plan & { providerPriceId: string } => row.providerPriceId !== null,
    );

    if (priced.length === 0) return null;

    try {
      const preview = await this.paddleClientService.getPricePreview(
        priced.map(({ providerPriceId }) => ({ priceId: providerPriceId, quantity: 1 })),
        clientIp,
      );

      const totalByPriceId = new Map(
        preview.details.lineItems.map((item) => [
          item.price.id,
          paddleAmountToNumber(item.totals.total, preview.currencyCode),
        ]),
      );

      const quoted = priced
        .map((row) => [row.billingPeriod, totalByPriceId.get(row.providerPriceId)] as const)
        .filter((entry): entry is readonly [number, number] => entry[1] !== undefined);

      return {
        currencyCode: preview.currencyCode,
        countryCode: preview.address?.countryCode ?? null,
        totalByPeriod: new Map(quoted),
      };
    } catch (error) {
      this.logger.error('Failed to fetch Paddle price preview for plans', error);
      return null;
    }
  }
}

/** Plans priced from the table, in the provider's own currency. */
function toPlans(rows: Plan[]): SubscriptionPlanDto[] {
  const monthly = rows.find((row) => row.billingPeriod === 30);
  const basePrice = monthly ? monthly.basePrice : null;

  return rows.map((row) => ({
    planId: row.id,
    days: row.billingPeriod,
    planPricing: buildPricing({
      currency: providerCurrency(row.provider),
      days: row.billingPeriod,
      total: row.basePrice,
      basePrice,
    }),
    countryCode: null,
    isTrial: row.type === 'one_time',
  }));
}

/** Re-prices the plans Paddle quoted, leaving any it didn't on their EUR pricing. */
function applyPaddleQuote(plans: SubscriptionPlanDto[], quote: PaddleQuote): SubscriptionPlanDto[] {
  const basePrice = quote.totalByPeriod.get(30) ?? null;

  return plans.map((plan) => {
    const total = quote.totalByPeriod.get(plan.days);
    if (total === undefined) return plan;

    return {
      ...plan,
      planPricing: buildPricing({
        currency: quote.currencyCode,
        days: plan.days,
        total,
        basePrice,
      }),
      countryCode: quote.countryCode,
    };
  });
}
