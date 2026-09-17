import { Key, useEffect, useState } from 'react';
import { Loading } from '../../../components';
import { useNavigation, usePlans } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { phCapture } from '../../../utils';
import { useSavedPayment } from '../payment/hooks/useSavedPayment';
import { PlansComponent } from './PlansComponent';

export default function PlansPage() {
  const navigate = useNavigation();
  const { profilePaymentPath } = useAppRoutes();
  const plans = usePlans();
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

  const sortedPlans = [...plans].sort((a, b) => b.period - a.period);

  const handleSelectionChange = (key: Key) => {
    setSelectedPeriod(Number(key));
  };

  const handleSubmit = () => {
    const plan = sortedPlans.find((p) => p.period === selectedPeriod) ?? sortedPlans[0];
    if (!plan) return;
    phCapture('plan_selected', { months: plan.period });
    navigate(profilePaymentPath, {
      state: { selectedPlan: { period: plan.period, pricing: plan.planPricing } },
    });
  };

  if (hasActiveMethod || isLoading) return <Loading />;

  return (
    <PlansComponent
      data={sortedPlans}
      activePeriod={selectedPeriod}
      onSubmit={handleSubmit}
      handleSelectionChange={handleSelectionChange}
    />
  );
}
