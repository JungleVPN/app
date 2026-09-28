import type { PlanProvider } from '@workspace/database';
import { scopeForOrigin } from '@workspace/types';

type GlobalProvider = Exclude<PlanProvider, 'yookassa'>;

const GLOBAL_PROVIDERS: readonly GlobalProvider[] = ['stripe', 'paddle', 'whop'];

const PROVIDER_CURRENCY: Record<PlanProvider, 'RUB' | 'EUR'> = {
  yookassa: 'RUB',
  stripe: 'EUR',
  paddle: 'EUR',
  whop: 'EUR',
};

const isGlobalProvider = (value: string): value is GlobalProvider =>
  GLOBAL_PROVIDERS.some((provider) => provider === value);

export function getGlobalPaymentProvider(): GlobalProvider {
  const configured = (process.env.GLOBAL_PAYMENT_PROVIDER ?? '').toLowerCase();
  if (!isGlobalProvider(configured)) {
    throw new Error(
      `GLOBAL_PAYMENT_PROVIDER must be one of ${GLOBAL_PROVIDERS.join(', ')}, got "${configured}"`,
    );
  }

  return configured;
}

/**
 * The provider that takes a payment started from `origin`: YooKassa for the
 * RU storefront (and callers with no origin, like the TMA and bot), the
 * configured global provider for everyone else.
 */
export function resolveProvider(origin: string | null | undefined): PlanProvider {
  if (scopeForOrigin(origin, process.env.PUBLIC_DOMAIN_RU) === 'ru') return 'yookassa';

  return getGlobalPaymentProvider();
}

/**
 * The currency a provider sells in when nothing picks another one: what
 * `/plans` lists and where a checkout falls back to.
 */
export const providerCurrency = (provider: PlanProvider): 'RUB' | 'EUR' =>
  PROVIDER_CURRENCY[provider];
