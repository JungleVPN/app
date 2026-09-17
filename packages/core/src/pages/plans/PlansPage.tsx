import { Key, useState } from 'react';
import { useNavigation, usePlans } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { Container } from '../../ui';
import { phCapture } from '../../utils';
import { PlansComponent } from '../profile/plans/PlansComponent';

export const PublicPlansPage = () => {
  const { getSubscriptionPath } = useAppRoutes();

  const navigate = useNavigation();
  const plans = usePlans();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12);

  const sortedPlans = [...plans].sort((a, b) => b.period - a.period);

  const handleSelectionChange = (key: Key) => {
    setSelectedPeriod(Number(key));
  };

  const handleSubmit = () => {
    const plan = sortedPlans.find((p) => p.period === selectedPeriod) ?? sortedPlans[0];
    if (!plan) return;
    phCapture('plan_selected', { months: plan.period });
    navigate(getSubscriptionPath(selectedPeriod));
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
