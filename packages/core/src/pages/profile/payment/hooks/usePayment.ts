import type { SubscriptionPlanDto } from '@workspace/types';
import { coreEnv } from '../../../../env';
import { useAuthStoreInfo } from '../../../../stores';
import { usePaddlePayment } from './usePaddlePayment';
import { usePromoValidation } from './usePromoValidation';
import { useStripePayment } from './useStripePayment';
import { useTelegramStarsPayment } from './useTelegramStarsPayment';
import { useYookassaPayment } from './useYookassaPayment';

export function usePayment(plan: SubscriptionPlanDto | undefined) {
  const { tgUser, rmnUser } = useAuthStoreInfo();
  const { supportUrl } = coreEnv;

  const needsEmailInput = Boolean(tgUser) && !rmnUser?.email;

  const yookassa = useYookassaPayment(plan);
  const stripe = useStripePayment(plan);
  const paddle = usePaddlePayment(plan);
  const stars = useTelegramStarsPayment(plan?.days ?? 30);
  const { validatePromo } = usePromoValidation();

  return {
    supportUrl,
    needsEmailInput,
    validatePromo,
    ...yookassa,
    ...stripe,
    ...paddle,
    ...stars,
  };
}
