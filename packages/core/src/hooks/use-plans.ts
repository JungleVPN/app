import { apiRoutes, SubscriptionPlanDto } from '@workspace/types';
import { useEffect } from 'react';
import { coreEnv } from '../env';
import { usePlansStatus, usePlansStore, usePlansStoreActions } from '../stores';

/**
 * Reads the shared plans from the global store, starting the fetch on first use.
 * Safe to call from several components: concurrent callers share one request,
 * and the result is reused for the rest of the session.
 */
export const usePlans = () => {
  const plans = usePlansStore((state) => state.plans);
  const status = usePlansStatus();
  const { setPlans, setStatus } = usePlansStoreActions();

  useEffect(() => {
    // 'error' is retryable: a transient failure would otherwise hide pricing for
    // the rest of the session, since the store outlives every consumer.
    if (status === 'loading' || status === 'loaded') return;

    setStatus('loading');
    const url = `${coreEnv.paymentsUrl}${apiRoutes.payments.plans}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: SubscriptionPlanDto[]) => setPlans(data))
      .catch(() => setStatus('error'));
  }, [status, setPlans, setStatus]);

  return plans;
};
