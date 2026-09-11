import { apiRoutes, SubscriptionPlanDto } from '@workspace/types';
import { useEffect } from 'react';
import { coreEnv } from '../env';
import { usePlansStore, usePlansStoreActions } from '../stores';

/**
 * Reads the shared plans from the global store, starting the fetch on first use.
 * Safe to call from several components: concurrent callers share one request,
 * and the result is reused for the rest of the session.
 */
export const usePlans = () => {
  const plans = usePlansStore((state) => state.plans);
  const { setPlans, setStatus } = usePlansStoreActions();

  useEffect(() => {
    // Status is read imperatively rather than subscribed to. A failed request
    // sets 'error', so depending on it here would feed the failure straight back
    // into this effect and re-request as fast as the network can fail.
    //
    // 'error' is still retryable, just not by itself: the next consumer to mount
    // tries again, so a transient failure does not hide pricing for the rest of
    // the session even though the store outlives every consumer.
    const { status } = usePlansStore.getState();
    if (status === 'loading' || status === 'loaded') return;

    setStatus('loading');
    const url = `${coreEnv.paymentsUrl}${apiRoutes.payments.plans}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: SubscriptionPlanDto[]) => setPlans(data))
      .catch(() => setStatus('error'));
  }, [setPlans, setStatus]);

  return plans;
};
