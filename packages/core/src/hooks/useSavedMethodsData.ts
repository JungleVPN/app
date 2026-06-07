import type { SavedMethodDto } from '@workspace/types';
import { useEffect } from 'react';
import { usePaymentsApi } from '../runtime';
import { useSavedMethodsStore } from '../stores';

/**
 * Module-level set tracks in-flight requests so multiple hook instances
 * (e.g. ProfileLayout + PaymentPage) never fire duplicate requests for
 * the same user.
 */
const pendingUserIds = new Set<string>();

/** Represents an active Stripe subscription as a saved method (read-only, no card details). */
function buildStripeMethod(userId: string): SavedMethodDto {
  return {
    id: 'stripe-subscription',
    userId,
    provider: 'stripe',
    paymentMethodId: '',
    paymentMethodType: 'stripe',
    title: null,
    card: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * Pre-fetches the user's saved payment methods and active-Stripe-subscription
 * status, merging both into a single `savedMethods` list in the store.
 *
 * Called once on page init (ProfileLayout). The list is fetched only while it is
 * still `null` in the store, so navigating between Profile and Payment pages
 * never re-triggers these requests — components read the cached store value.
 * Both requests are awaited before writing, so the list never flickers.
 *
 * All store reads/writes go through `useSavedMethodsStore.getState()` inside the
 * effect (never reactive deps), so store updates can't re-run the effect or
 * cause an update-depth loop.
 */
export function useSavedMethodsData(userId: string): void {
  const paymentsApi = usePaymentsApi();

  useEffect(() => {
    if (!userId) return;
    // All store access via getState() — never reactive deps.
    if (useSavedMethodsStore.getState().savedMethods !== null) return;
    if (pendingUserIds.has(userId)) return;

    pendingUserIds.add(userId);

    Promise.all([
      paymentsApi.getSavedMethods(userId).catch((err) => {
        console.error('Failed to pre-fetch saved methods:', err);
        return [] as SavedMethodDto[];
      }),
      paymentsApi.getStripeSubscription(userId).catch((err) => {
        console.error('Failed to pre-fetch Stripe subscription:', err);
        return { active: false, portalUrl: null };
      }),
    ])
      .then(([methods, stripe]) => {
        const combined = stripe.active ? [...methods, buildStripeMethod(userId)] : methods;
        useSavedMethodsStore.getState().actions.setSavedMethods(combined);
      })
      .finally(() => pendingUserIds.delete(userId));
  }, [userId, paymentsApi]);
}
