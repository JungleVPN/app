import { Key, useState } from 'react';
import { useNavigation, usePlans } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { Container } from '../../ui';
import { mapPlans, phCapture } from '../../utils';
import { PlansComponent } from '../profile/plans/PlansComponent';

export const PublicPlansPage = () => {
  const { getSubscriptionPath } = useAppRoutes();

  const navigate = useNavigation();
  const plans = usePlans();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(365);

  const sortedPlans = mapPlans(plans);

  const handleSelectionChange = (key: Key) => {
    setSelectedPeriod(Number(key));
  };

  const handleSubmit = () => {
    const plan = sortedPlans.find((p) => p.days === selectedPeriod) ?? sortedPlans[0];
    if (!plan) return;
    phCapture('plan_selected', { days: plan.days });
    navigate(getSubscriptionPath(plan.planId));
  };

  return (
    <Container maxWidth={'sm'}>
      <PlansComponent
        data={sortedPlans}
        activePeriod={selectedPeriod}
        onSubmit={handleSubmit}
        handleSelectionChange={handleSelectionChange}
      />
    </Container>
  );
};
