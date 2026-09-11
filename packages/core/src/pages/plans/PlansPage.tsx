import { Key, useState } from 'react';
import { useNavigation, usePlans } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { usePlatformStore } from '../../stores';
import { Container } from '../../ui';
import { isGlobalOrigin, phCapture } from '../../utils';
import { PlansComponent } from '../profile/plans/PlansComponent';

export const PublicPlansPage = () => {
  const isRu = !isGlobalOrigin();
  const { platformType } = usePlatformStore();
  const isTelegram = platformType === 'telegram';
  const { getSubscriptionPath } = useAppRoutes();

  const navigate = useNavigation();
  const plans = usePlans();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12);

  const sortedPlans = [...plans].sort((a, b) => b.months - a.months);

  const handleSelectionChange = (key: Key) => {
    setSelectedPeriod(Number(key));
  };

  const handleSubmit = () => {
    const plan = sortedPlans.find((p) => p.months === selectedPeriod) ?? sortedPlans[0];
    if (!plan) return;
    phCapture('plan_selected', { months: plan.months });
    navigate(getSubscriptionPath(selectedPeriod));
  };

  return (
    <Container maxWidth={'sm'}>
      <PlansComponent
        data={sortedPlans}
        isRu={isRu}
        isTelegram={isTelegram}
        activePeriod={selectedPeriod}
        onSubmit={handleSubmit}
        handleSelectionChange={handleSelectionChange}
      />
    </Container>
  );
};
