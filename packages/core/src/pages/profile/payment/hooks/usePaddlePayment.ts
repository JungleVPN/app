import { useCallback, useState } from 'react';
import { useNavigation } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo, usePlanByPeriod } from '../../../../stores';
import { getReferralUserId, phCapture } from '../../../../utils';

export function usePaddlePayment(selectedPeriod: number) {
  const { rmnUser } = useAuthStoreInfo();
  const paymentsApi = usePaymentsApi();
  const { profilePaddleCheckoutPath } = useAppRoutes();
  const navigate = useNavigation();
  // Detected from the payer's IP while the plan was priced — prefilling it
  // alongside the email is what lets the checkout skip Paddle's details step.
  const countryCode = usePlanByPeriod(selectedPeriod)?.countryCode ?? null;

  const redirectTo = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  const [isOpeningPaddlePortal, setIsOpeningPaddlePortal] = useState(false);
  const [isPaddlePaying, setIsPaddlePaying] = useState(false);

  // Mint a fresh Customer Portal URL on demand (an explicit user action), so
  // we never have to cache a portal session that can expire.
  const handleOpenPaddlePortal = useCallback(async () => {
    const uuid = rmnUser?.id;
    if (!uuid) return;
    setIsOpeningPaddlePortal(true);
    try {
      const status = await paymentsApi.getPaddleSubscription();
      if (status.portalUrl) redirectTo(status.portalUrl);
    } finally {
      setIsOpeningPaddlePortal(false);
    }
  }, [rmnUser?.id, paymentsApi, redirectTo]);

  const handlePaddlePayment = async (email?: string) => {
    if (!rmnUser) return;

    setIsPaddlePaying(true);
    try {
      const payerEmail = email ?? rmnUser.email ?? undefined;
      if (!payerEmail) return;

      const { priceId, customData } = await paymentsApi.createPublicPaddleCheckout({
        email: payerEmail,
        selectedPeriod,
        toltReferralId: window.tolt_referral ?? null,
        inviterId: getReferralUserId() ?? undefined,
      });

      phCapture('checkout_started', { payment_provider: 'paddle', months: selectedPeriod });

      navigate(profilePaddleCheckoutPath, {
        state: { priceId, customData, email: payerEmail, countryCode, selectedPeriod },
      });
    } finally {
      setIsPaddlePaying(false);
    }
  };

  return {
    handleOpenPaddlePortal,
    isOpeningPaddlePortal,
    handlePaddlePayment,
    isPaddlePaying,
  };
}
