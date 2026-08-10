import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { coreEnv } from '../../../../env';
import { useAuthStoreInfo, usePlatformStore, useSavedMethodsStoreInfo } from '../../../../stores';
import { usePromoValidation } from './usePromoValidation';
import { useStripePayment } from './useStripePayment';
import { useTelegramStarsPayment } from './useTelegramStarsPayment';
import { useYookassaPayment } from './useYookassaPayment';

export function usePayment(selectedPeriod: number) {
  const { t } = useTranslation();
  const { tgUser, rmnUser } = useAuthStoreInfo();
  const { platformType } = usePlatformStore();
  const { supportUrl } = coreEnv;
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
  const needsEmailInput = Boolean(tgUser) && !rmnUser?.email;
  const isLoading = savedMethods === null;

  const yookassa = useYookassaPayment(selectedPeriod);
  const stripe = useStripePayment(selectedPeriod);
  const stars = useTelegramStarsPayment(selectedPeriod);
  const { validatePromo } = usePromoValidation();

  return {
    savedMethods,
    supportUrl,
    platformType,
    hasActiveMethod,
    hasStripeSubscription,
    needsEmailInput,
    isLoadingMethods: isLoading,
    isLoading,
    validatePromo,
    ...yookassa,
    ...stripe,
    ...stars,
  };
}
