import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { bigintTransformer } from '../utils/transformers';

export type PlanType = 'one_time' | 'recurring';
export type PlanProvider = 'yookassa' | 'stripe' | 'paddle' | 'whop';

/**
 * One purchasable price, at one provider, for one billing period — the single
 * source of truth for what we sell and what we still honour.
 *
 * `availableForPurchase` separates the two: a row taken off sale disappears
 * from `/plans` and can no longer be checked out, but stays here so renewals
 * and webhooks for existing subscribers still resolve it. A partial unique
 * index keeps at most one row per provider and period on sale.
 *
 * Currency is not stored: it is fixed per provider (see `providerCurrency`).
 */
@Entity('subscription_plans')
@Index('subscription_plans_one_on_sale_per_period', ['provider', 'billingPeriod'], {
  unique: true,
  where: '"available_for_purchase"',
})
@Check('subscription_plans_billing_period_check', '"billing_period" > 0')
@Check('subscription_plans_base_price_check', '"base_price" > 0')
export class Plan {
  /** Returned to the frontend as `planId`. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['one_time', 'recurring'], enumName: 'plan_type' })
  type: PlanType;

  /** Subscription length in days. */
  @Column({ name: 'billing_period', type: 'int' })
  billingPeriod: number;

  /** Major units of the provider's currency, e.g. 0.99 EUR or 200 RUB. */
  @Column({
    name: 'base_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: bigintTransformer,
  })
  basePrice: number;

  @Column({
    type: 'enum',
    enum: ['yookassa', 'stripe', 'paddle', 'whop'],
    enumName: 'plan_provider',
  })
  provider: PlanProvider;

  /** The provider's catalog price id; null for YooKassa, which has no catalog. */
  @Column({ name: 'provider_price_id', type: 'text', nullable: true, unique: true })
  providerPriceId: string | null;

  @Column({ name: 'available_for_purchase', type: 'boolean', default: true })
  availableForPurchase: boolean;

  @Column({ name: 'custom_data', type: 'jsonb', default: () => "'{}'" })
  customData: Record<string, unknown>;
}
