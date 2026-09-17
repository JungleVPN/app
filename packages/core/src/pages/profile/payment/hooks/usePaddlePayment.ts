import type { Paddle } from '@paddle/paddle-js';
import { initializePaddle } from '@paddle/paddle-js';
import { useCallback, useState } from 'react';
import { useTheme } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo } from '../../../../stores';
import { getReferralUserId, phCapture } from '../../../../utils';
import {
  getPaddleClientToken,
  getPaddleEnvironment,
} from '../../../paddleGetSubscription/paddleEnv';

export function usePaddlePayment(selectedPeriod: number) {
  const { rmnUser } = useAuthStoreInfo();
  const paymentsApi = usePaymentsApi();
  const { paymentReturnPath } = useAppRoutes();
  const { theme } = useTheme();

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

      // Failing loudly on an unset/invalid env var is deliberate: a
      // misconfigured token must never silently open a checkout against the
      // wrong Paddle account.
      const paddle: Paddle | undefined = await initializePaddle({
        token: getPaddleClientToken(),
        environment: getPaddleEnvironment(),
      });
      if (!paddle) return;

      phCapture('checkout_started', { payment_provider: 'paddle', months: selectedPeriod });

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData,
        customer: { email: payerEmail },
        settings: {
          successUrl: `${window.location.origin}${paymentReturnPath}`,
          // The email was just linked and handed to Paddle above — the
          // checkout must not let the payer swap it for a different address.
          allowLogout: false,
          theme,
        },
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
