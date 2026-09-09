import { apiRoutes, SubscriptionPlanDto } from '@workspace/types';
import { useEffect } from 'react';
import { coreEnv } from '../env';
import { usePlansStatus, usePlansStore, usePlansStoreActions } from '../stores';

/**
 * Reads the shared plans from the global store, kicking off the one-time fetch
 * on first use. Safe to call from several components — only the first `idle`
 * caller performs the request.
 */
export const usePlans = () => {
  const plans = usePlansStore((state) => state.plans);
  const status = usePlansStatus();
  const { setPlans, setStatus } = usePlansStoreActions();

  useEffect(() => {
    if (status !== 'idle') return;

    setStatus('loading');
    const url = `${coreEnv.paymentsUrl}${apiRoutes.payments.plans}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: SubscriptionPlanDto[]) => setPlans(data))
      .catch(() => setStatus('error'));
  }, [status, setPlans, setStatus]);

  return plans;
};
