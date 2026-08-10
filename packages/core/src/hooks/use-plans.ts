import { apiRoutes, SubscriptionPlanDto } from '@workspace/types';
import { useEffect, useState } from 'react';
import { coreEnv } from '../env';

export const usePlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);

  useEffect(() => {
    const url = `${coreEnv.paymentsUrl}${apiRoutes.payments.plans}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: SubscriptionPlanDto[]) => setPlans(data))
      .catch(() => {});
  }, []);

  return plans;
};
