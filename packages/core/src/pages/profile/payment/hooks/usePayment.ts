import { coreEnv } from '../../../../env';
import { useAuthStoreInfo, usePlatformStore, useSavedMethodsStoreInfo } from '../../../../stores';
import { useTelegramStarsPayment } from './useTelegramStarsPayment';
import { useYookassaPayment } from './useYookassaPayment';

export function usePayment() {
  const { tgUser, rmnUser } = useAuthStoreInfo();
  const { platformType } = usePlatformStore();
  const { allowedPeriods, supportUrl } = coreEnv;
  const savedMethods = useSavedMethodsStoreInfo();

  const hasActiveMethod = savedMethods?.some((m) => m.isActive) ?? false;
  const needsEmailInput = Boolean(tgUser) && !rmnUser?.email;
  const isLoadingMethods = savedMethods === null;

  const yookassa = useYookassaPayment();
  const stars = useTelegramStarsPayment();

  return {
    savedMethods,
    allowedPeriods,
    supportUrl,
    platformType,
    hasActiveMethod,
    needsEmailInput,
    isLoadingMethods,
    ...yookassa,
    ...stars,
  };
}
