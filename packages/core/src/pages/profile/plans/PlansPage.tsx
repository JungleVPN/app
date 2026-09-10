import { Key, useEffect, useState } from 'react';
import { Loading } from '../../../components';
import { useNavigation, usePlans } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { usePlatformStore } from '../../../stores';
import { isGlobalOrigin, phCapture } from '../../../utils';
import { useSavedPayment } from '../payment/hooks/useSavedPayment';
import { PlansComponent } from './PlansComponent';

export default function PlansPage() {
  const navigate = useNavigation();
  const { profilePaymentPath } = useAppRoutes();
  const { platformType } = usePlatformStore();
  const plans = usePlans();
  const isRu = !isGlobalOrigin();
  const isTelegram = platformType === 'telegram';
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12);

  const { hasActiveMethod, savedMethods } = useSavedPayment();
  const isLoading = savedMethods === null;

  useEffect(() => {
    phCapture('plans_viewed');
  }, []);

  useEffect(() => {
    if (hasActiveMethod) {
      navigate(profilePaymentPath);
    }
  });

  const sortedPlans = [...plans].sort((a, b) => b.months - a.months);

  const handleSelectionChange = (key: Key) => {
    setSelectedPeriod(Number(key));
  };

  const handleSubmit = () => {
    const plan = sortedPlans.find((p) => p.months === selectedPeriod) ?? sortedPlans[0];
    if (!plan) return;
    phCapture('plan_selected', { months: plan.months });
    navigate(profilePaymentPath, {
      state: {
        selectedPlan: {
          months: plan.months,
          priceEur: parseFloat(plan.priceEur),
          priceRub: parseFloat(plan.priceRub),
        },
      },
    });
  };

  if (hasActiveMethod || isLoading) return <Loading />;

  return (
    <PlansComponent
      data={sortedPlans}
      isRu={isRu}
      isTelegram={isTelegram}
      activePeriod={selectedPeriod}
      onSubmit={handleSubmit}
      handleSelectionChange={handleSelectionChange}
    />
  );
}
