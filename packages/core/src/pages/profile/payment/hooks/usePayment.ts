import { coreEnv } from '../../../../env';
import { useAuthStoreInfo } from '../../../../stores';
import { usePromoValidation } from './usePromoValidation';
import { useStripePayment } from './useStripePayment';
import { useTelegramStarsPayment } from './useTelegramStarsPayment';
import { useYookassaPayment } from './useYookassaPayment';

export function usePayment(selectedPeriod: number) {
  const { tgUser, rmnUser } = useAuthStoreInfo();
  const { supportUrl } = coreEnv;

  const needsEmailInput = Boolean(tgUser) && !rmnUser?.email;

  const yookassa = useYookassaPayment(selectedPeriod);
  const stripe = useStripePayment(selectedPeriod);
  const stars = useTelegramStarsPayment(selectedPeriod);
  const { validatePromo } = usePromoValidation();

  return {
    supportUrl,
    needsEmailInput,
    validatePromo,
    ...yookassa,
    ...stripe,
    ...stars,
  };
}
