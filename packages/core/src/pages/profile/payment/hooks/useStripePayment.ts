import { openLink } from '@tma.js/sdk-react';
import { useCallback, useState } from 'react';
import { useRemnawaveApi } from '../../../../api';
import { coreEnv } from '../../../../env';
import { useCreateStripeSession } from '../../../../hooks';
import { usePaymentsApi } from '../../../../runtime';
import { useAuthStoreActions, useAuthStoreInfo, usePlatformStore } from '../../../../stores';
import { analytics } from '../../../../utils';

/**
 * Stripe checkout flow for the web/TMA payment page.
 *
 * Creates a Stripe session via the existing backend provider (EUR pricing) and
 * redirects the user to the returned Stripe Checkout / Billing Portal URL.
 * Subscription extension is handled by the existing Stripe webhook.
 */
export function useStripePayment() {
  const { rmnUser, tgUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { platformType, clientPlatform } = usePlatformStore();
  const { allowedAmountStripe } = coreEnv;
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();

  const { isLoading: isStripePaying, execute: createStripeSession } =
    useCreateStripeSession(paymentsApi);
  const isNativeApp =
    platformType !== 'web' && (clientPlatform === 'ios' || clientPlatform === 'android');

  const redirectTo = useCallback(
    (url: string) => {
      if (isNativeApp) {
        openLink(url);
      } else {
        window.location.href = url;
      }
    },
    [isNativeApp],
  );

  const [isOpeningStripePortal, setIsOpeningStripePortal] = useState(false);

  // Mint a fresh Billing Portal URL on demand (an explicit user action), so we
  // never have to cache a portal URL that can expire.
  const handleOpenStripePortal = useCallback(async () => {
    const uuid = rmnUser?.uuid;
    if (!uuid) return;
    setIsOpeningStripePortal(true);
    try {
      const status = await paymentsApi.getStripeSubscription();
      if (status.portalUrl) redirectTo(status.portalUrl);
    } finally {
      setIsOpeningStripePortal(false);
    }
  }, [rmnUser?.uuid, paymentsApi, redirectTo]);

  const handleStripePayment = async (email?: string, promoCode?: string) => {
    if (!rmnUser) return;

    let activeUser = rmnUser;

    if (email) {
      const result = await remnawaveApi.linkEmail(email);
      if (result) {
        setRmnUser(result);
        activeUser = result;
      }
    }

    const payerEmail = email ?? activeUser.email ?? undefined;
    if (!payerEmail) return;

    const session = await createStripeSession({
      userId: activeUser.uuid,
      payment: { amount: allowedAmountStripe, currency: 'EUR' },
      promoCode: promoCode || null,
      userStatus: activeUser.status,
      toltReferralId: window.tolt_referral ?? null,
      metadata: {
        email: payerEmail,
        userId: activeUser.uuid,
        ...(tgUser?.id != null ? { telegramId: String(tgUser.id) } : {}),
      },
    });

    if (!session?.url) return;
    analytics.beginCheckout('stripe');
    redirectTo(session.url);
  };

  return {
    isStripePaying,
    handleStripePayment,
    handleOpenStripePortal,
    isOpeningStripePortal,
  };
}
