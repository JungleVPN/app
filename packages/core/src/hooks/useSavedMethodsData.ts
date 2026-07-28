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

export function useSavedMethodsData(userId: string): void {
  const paymentsApi = usePaymentsApi();

  useEffect(() => {
    if (!userId) return;
    // All store access via getState() — never reactive deps.
    if (useSavedMethodsStore.getState().savedMethods !== null) return;
    if (pendingUserIds.has(userId)) return;

    pendingUserIds.add(userId);

    Promise.all([
      paymentsApi.getSavedMethods().catch((err) => {
        console.error('Failed to pre-fetch saved methods:', err);
        return [] as SavedMethodDto[];
      }),
      paymentsApi.getStripeSubscription().catch((err) => {
        console.error('Failed to pre-fetch Stripe subscription:', err);
        return { active: false, portalUrl: null };
      }),
    ])
      .then(([methods]) => {
        useSavedMethodsStore.getState().actions.setSavedMethods(methods);
      })
      .finally(() => pendingUserIds.delete(userId));
  }, [userId, paymentsApi]);
}
