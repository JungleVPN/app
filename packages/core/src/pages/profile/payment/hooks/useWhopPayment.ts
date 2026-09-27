import type { SubscriptionPlanDto } from '@workspace/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo } from '../../../../stores';
import { getReferralUserId, phCapture } from '../../../../utils';
import { checkoutErrorKey } from '../../../getSubscription/checkoutErrors';
import type { WhopCheckoutState } from '../../../whopCheckout/whopCheckoutState';

/**
 * Starts a Whop checkout from the profile payment page (mirrors
 * `usePaddlePayment`): the backend creates the checkout configuration, and
 * the profile checkout route mounts it.
 */
export function useWhopPayment(plan: SubscriptionPlanDto | undefined) {
  const { t } = useTranslation();
  const { rmnUser } = useAuthStoreInfo();
  const paymentsApi = usePaymentsApi();
  const { profilePaddleCheckoutPath } = useAppRoutes();
  const navigate = useNavigation();

  const [isWhopPaying, setIsWhopPaying] = useState(false);
  // The backend refuses a checkout for reasons the payer can act on — an email
  // that already subscribes, or too many attempts — so the reason is shown.
  const [whopError, setWhopError] = useState<string | null>(null);

  const handleWhopPayment = async (email?: string) => {
    if (!rmnUser || !plan) return;

    setIsWhopPaying(true);
    setWhopError(null);
    try {
      const payerEmail = email ?? rmnUser.email ?? undefined;
      if (!payerEmail) return;

      const { checkoutConfigurationId } = await paymentsApi.createPublicWhopCheckout({
        email: payerEmail,
        planId: plan.planId,
        toltReferralId: window.tolt_referral ?? null,
        inviterId: getReferralUserId() ?? undefined,
      });

      phCapture('checkout_started', { payment_provider: 'whop', days: plan.days });

      navigate(profilePaddleCheckoutPath, {
        state: {
          checkoutConfigurationId,
          email: payerEmail,
          selectedPeriod: plan.days,
        } satisfies WhopCheckoutState,
      });
    } catch (error) {
      setWhopError(t(checkoutErrorKey(error)));
    } finally {
      setIsWhopPaying(false);
    }
  };

  return { handleWhopPayment, isWhopPaying, whopError };
}
