import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSavedMethodsStoreInfo } from '../../../../stores';

export const useSavedPayment = () => {
  const { t } = useTranslation();
  const rawMethods = useSavedMethodsStoreInfo();

  const savedMethods = useMemo(
    () =>
      rawMethods?.map((m) =>
        m.provider === 'stripe' ? { ...m, title: m.title ?? t('payment.methodStripe') } : m,
      ) ?? null,
    [rawMethods, t],
  );

  const hasActiveMethod = savedMethods?.some((m) => m.isActive) ?? false;
  const hasStripeSubscription = savedMethods?.some((m) => m.provider === 'stripe') ?? false;

  return {
    savedMethods,
    hasActiveMethod,
    hasStripeSubscription,
  };
};
