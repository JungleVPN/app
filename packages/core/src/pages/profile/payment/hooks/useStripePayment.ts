import { openLink } from '@tma.js/sdk-react';
import { useCallback } from 'react';
import { useRemnawaveApi } from '../../../../api';
import { coreEnv } from '../../../../env';
import { useCreateStripeSession, useUpdateUser } from '../../../../hooks';
import { usePaymentsApi } from '../../../../runtime';
import {
  useAuthStoreActions,
  useAuthStoreInfo,
  usePlatformStore,
  useStripeSubscriptionInfo,
} from '../../../../stores';

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
  const { stripeAmount } = coreEnv;
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();

  const { isLoading: isStripePaying, execute: createStripeSession } =
    useCreateStripeSession(paymentsApi);
  const { execute: updateUser } = useUpdateUser(remnawaveApi);

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

  const stripeSubscription = useStripeSubscriptionInfo();

  const handleOpenStripePortal = useCallback(() => {
    if (stripeSubscription?.portalUrl) redirectTo(stripeSubscription.portalUrl);
  }, [stripeSubscription, redirectTo]);

  const handleStripePayment = async (email?: string) => {
    if (!rmnUser) return;

    let activeUser = rmnUser;

    if (email) {
      const byEmail = await remnawaveApi.getUserByEmail({ email });
      const existingUserWithEmail = byEmail?.[0];

      if (existingUserWithEmail && existingUserWithEmail.uuid !== rmnUser.uuid) {
        // Web account exists for this email — link Telegram ID to it and use it for payment.
        const linked = await updateUser({
          uuid: existingUserWithEmail.uuid,
          telegramId: tgUser?.id != null ? Number(tgUser.id) : undefined,
        });
        if (linked) {
          setRmnUser(linked);
          activeUser = linked;
        }
      } else {
        // No separate web account — just save the email on the current account.
        const updated = await updateUser({ uuid: rmnUser.uuid, email });
        if (updated) {
          setRmnUser(updated);
          activeUser = updated;
        }
      }
    }

    const payerEmail = email ?? activeUser.email ?? undefined;
    if (!payerEmail) return;

    const session = await createStripeSession({
      userId: activeUser.uuid,
      payment: { amount: stripeAmount, currency: 'EUR' },
      metadata: {
        email: payerEmail,
        userId: activeUser.uuid,
        ...(tgUser?.id != null ? { telegramId: String(tgUser.id) } : {}),
      },
    });

    if (!session?.url) return;
    redirectTo(session.url);
  };

  return {
    stripeAmount,
    isStripePaying,
    handleStripePayment,
    stripeSubscription,
    handleOpenStripePortal,
  };
}
