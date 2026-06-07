import { useEffect } from 'react';
import { usePaymentsApi } from '../runtime';
import { useSavedMethodsStore } from '../stores';

/**
 * Module-level sets track in-flight requests so multiple hook instances
 * (e.g. ProfileLayout + PaymentPage) never fire duplicate requests for
 * the same user.
 */
const pendingMethodUserIds = new Set<string>();
const pendingSubscriptionUserIds = new Set<string>();

/**
 * Pre-fetches the user's saved payment methods AND active-Stripe-subscription
 * status, writing both into the shared saved-methods store.
 *
 * Called once on page init (ProfileLayout). Each value is fetched only while it
 * is still `null` in the store, so navigating between Profile and Payment pages
 * never re-triggers these requests — components read the cached store values.
 *
 * All store reads/writes go through `useSavedMethodsStore.getState()` inside the
 * effect (never reactive deps), so store updates can't re-run the effect or
 * cause an update-depth loop.
 */
export function useSavedMethodsData(userId: string): void {
  const paymentsApi = usePaymentsApi();

  useEffect(() => {
    if (!userId) return;
    const { savedMethods, stripeSubscription } = useSavedMethodsStore.getState();

    if (savedMethods === null && !pendingMethodUserIds.has(userId)) {
      pendingMethodUserIds.add(userId);
      paymentsApi
        .getSavedMethods(userId)
        .then((methods) => useSavedMethodsStore.getState().actions.setSavedMethods(methods))
        .catch((err) => console.error('Failed to pre-fetch saved methods:', err))
        .finally(() => pendingMethodUserIds.delete(userId));
    }

    if (stripeSubscription === null && !pendingSubscriptionUserIds.has(userId)) {
      pendingSubscriptionUserIds.add(userId);
      paymentsApi
        .getStripeSubscription(userId)
        .then((status) => useSavedMethodsStore.getState().actions.setStripeSubscription(status))
        .catch((err) => {
          console.error('Failed to pre-fetch Stripe subscription:', err);
          useSavedMethodsStore
            .getState()
            .actions.setStripeSubscription({ active: false, portalUrl: null });
        })
        .finally(() => pendingSubscriptionUserIds.delete(userId));
    }
  }, [userId, paymentsApi]);
}
