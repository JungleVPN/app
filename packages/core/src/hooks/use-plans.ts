import { apiRoutes, SubscriptionPlanDto } from '@workspace/types';
import { useEffect } from 'react';
import { coreEnv } from '../env';
import { usePlansStore } from '../stores';

/**
 * Fetches the plans into the shared store, unless they are loaded or already
 * on their way. Also what a "Retry" after a failed load calls.
 */
export function loadPlans(): void {
  const { status, actions } = usePlansStore.getState();
  if (status === 'loading' || status === 'loaded') return;

  actions.setStatus('loading');
  const url = `${coreEnv.paymentsUrl}${apiRoutes.payments.plans}`;
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Plans request failed (${response.status})`);
      return response.json();
    })
    .then((data: SubscriptionPlanDto[]) => actions.setPlans(data))
    .catch(() => actions.setStatus('error'));
}

/**
 * Reads the shared plans from the global store, starting the fetch on first use.
 * Safe to call from several components: concurrent callers share one request,
 * and the result is reused for the rest of the session.
 */
export const usePlans = () => {
  const plans = usePlansStore((state) => state.plans);

  useEffect(() => {
    loadPlans();
  }, []);

  return plans;
};
