import {
  NO_PROVIDER_SUBSCRIPTION,
  type ProviderSubscriptionDto,
  type SavedMethodDto,
} from '@workspace/types';
import { useEffect } from 'react';
import { usePaymentsApi } from '../runtime';
import { toProviderSubscription, useSavedMethodsStore } from '../stores';

/**
 * Module-level set tracks in-flight requests so multiple hook instances
 * (e.g. ProfileLayout + PaymentPage) never fire duplicate requests for
 * the same user.
 */
const pendingUserIds = new Set<number>();

type PaymentsApi = ReturnType<typeof usePaymentsApi>;

/**
 * Asks every provider for the user's billing and stores the answers.
 *
 * A provider that fails is treated as "no billing there" rather than failing
 * the batch, so one provider being down cannot hide the others' answers or
 * leave the UI stuck loading.
 */
export async function fetchBillingState(paymentsApi: PaymentsApi): Promise<void> {
  const onFailure = (provider: string) => (err: unknown) => {
    console.error(`Failed to pre-fetch ${provider} billing:`, err);
    return NO_PROVIDER_SUBSCRIPTION;
  };

  const [yookassa, stripe, paddle, whop] = await Promise.all([
    paymentsApi
      .getYookassaSavedMethods()
      .then((methods: SavedMethodDto[]) => toProviderSubscription(methods))
      .catch(onFailure('YooKassa')) as Promise<ProviderSubscriptionDto>,
    paymentsApi.getStripeSubscription().catch(onFailure('Stripe')),
    paymentsApi.getPaddleSubscription().catch(onFailure('Paddle')),
    paymentsApi.getWhopSubscription().catch(onFailure('Whop')),
  ]);
  useSavedMethodsStore.getState().actions.setBillingState({ yookassa, stripe, paddle, whop });
}

/**
 * Pre-fetches the user's billing from every provider.
 *
 * Each has to be asked: each answers only for itself, so asking YooKassa alone
 * reports a Stripe, Paddle or Whop subscriber as having no billing at all.
 * None of these calls the provider's API — every answer comes from our own
 * records — so this stays cheap enough to run on every profile load.
 */
export function useSavedMethodsData(userId: number | undefined): void {
  const paymentsApi = usePaymentsApi();

  useEffect(() => {
    if (!userId) return;
    // All store access via getState() — never reactive deps.
    if (useSavedMethodsStore.getState().isLoaded) return;
    if (pendingUserIds.has(userId)) return;

    pendingUserIds.add(userId);

    fetchBillingState(paymentsApi).finally(() => pendingUserIds.delete(userId));
  }, [userId, paymentsApi]);
}
