import { Injectable, Logger } from '@nestjs/common';
import { paddleAmountToNumber } from '@payments/providers/paddle/paddle.utils';
import { PaddleClientService } from '@payments/providers/paddle/paddle-client.service';
import {
  buildPricing,
  type Currency,
  enabledPeriodMonths,
  getPriceForPeriod,
} from '@payments/utils/amount';
import { isGlobalOrigin, type SubscriptionPlanDto } from '@workspace/types';

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

  constructor(private readonly paddleClientService: PaddleClientService) {}

  /**
   * Every enabled subscription period, priced in the one currency this visitor
   * will actually be charged in.
   *
   * The storefront the request came from decides that, and nothing else:
   *
   * - RU domains pay in roubles (YooKassa, Telegram Stars) from our own table.
   * - Everyone else pays through Paddle, which quotes their local currency
   *   from `clientIp`, falling back to our EUR table when it can't be reached.
   *
   * The response deliberately names no provider: which one takes the payment
   * is decided again, the same way, when the client asks to start a checkout.
   */
  async getPlans({
    origin,
    clientIp,
  }: {
    origin: string | null;
    clientIp: string | null;
  }): Promise<SubscriptionPlanDto[]> {
    if (!isGlobalOrigin(origin, process.env.PUBLIC_DOMAIN_RU)) {
      return this.buildPlans('RUB');
    }

    const plans = this.buildPlans('EUR');
    const quote = await this.fetchPaddleQuote(clientIp);

    return quote ? applyPaddleQuote(plans, quote) : plans;
  }

  /** Every enabled period priced from our own table for `currency`. */
  private buildPlans(currency: Currency): SubscriptionPlanDto[] {
    const periods = enabledPeriodMonths();
    // The 1-month price is the baseline every longer period's discount is measured against.
    const basePrice = periods.includes(1) ? this.findPrice(currency, 1) : null;

    return periods
      .map((period): SubscriptionPlanDto | null => {
        const total = this.findPrice(currency, period);
        if (total === null) return null;

        return {
          period,
          planPricing: buildPricing({ currency, months: period, total, basePrice }),
          countryCode: null,
        };
      })
      .filter((plan): plan is SubscriptionPlanDto => plan !== null);
  }

  /**
   * Paddle's quote for every period it has a catalog price for, localized to
   * `clientIp` — or null when no period is priced in Paddle, or Paddle
   * couldn't be reached at all. Neither is fatal: plans keep their EUR
   * pricing. (`PaddleClientService.getPricePreview` has its own EUR fallback,
   * but that only covers a location Paddle can't price, not Paddle being down.)
   */
  private async fetchPaddleQuote(clientIp: string | null): Promise<PaddleQuote | null> {
    const pricedPeriods = enabledPeriodMonths()
      .map((period) => ({ period, priceId: process.env[`PADDLE_PRICE_ID_MONTH_${period}`] }))
      .filter((entry): entry is { period: number; priceId: string } => Boolean(entry.priceId));

    if (pricedPeriods.length === 0) return null;

    try {
      const preview = await this.paddleClientService.getPricePreview(
        pricedPeriods.map(({ priceId }) => ({ priceId, quantity: 1 })),
        clientIp,
      );

      const totalByPriceId = new Map(
        preview.details.lineItems.map((item) => [
          item.price.id,
          paddleAmountToNumber(item.totals.total, preview.currencyCode),
        ]),
      );

      const quoted = pricedPeriods
        .map(({ period, priceId }) => [period, totalByPriceId.get(priceId)] as const)
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

  /** The configured price for a period, or null when this currency doesn't price it. */
  private findPrice(currency: Currency, period: number): number | null {
    try {
      return Number(getPriceForPeriod(currency, period));
    } catch {
      return null;
    }
  }
}

/** Re-prices the plans Paddle quoted, leaving any it didn't on their EUR pricing. */
function applyPaddleQuote(plans: SubscriptionPlanDto[], quote: PaddleQuote): SubscriptionPlanDto[] {
  const basePrice = quote.totalByPeriod.get(1) ?? null;

  return plans.map((plan) => {
    const total = quote.totalByPeriod.get(plan.period);
    if (total === undefined) return plan;

    return {
      period: plan.period,
      planPricing: buildPricing({
        currency: quote.currencyCode,
        months: plan.period,
        total,
        basePrice,
      }),
      countryCode: quote.countryCode,
    };
  });
}
