import { openLink } from '@tma.js/sdk-react';
import { useCreateStripeSession } from '../../../../hooks';
import { usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo, usePlatformStore } from '../../../../stores';
import { coreEnv } from '../../../../env';

export function useExtraDeviceStripePayment() {
  const { rmnUser, tgUser } = useAuthStoreInfo();
  const { platformType, clientPlatform } = usePlatformStore();
  const paymentsApi = usePaymentsApi();

  const { isLoading: isStripePaying, execute: createStripeSession } =
    useCreateStripeSession(paymentsApi);

  const isNativeApp =
    platformType !== 'web' && (clientPlatform === 'ios' || clientPlatform === 'android');

  const handleStripePayment = async (email?: string) => {
    if (!rmnUser) return;

    const payerEmail = email ?? rmnUser.email;
    if (!payerEmail) return;

    const session = await createStripeSession({
      userId: rmnUser.uuid,
      purchaseType: 'extra_device',
      payment: { amount: coreEnv.extraDevicePrice, currency: 'EUR' },
      metadata: {
        email: payerEmail,
        userId: rmnUser.uuid,
        ...(tgUser?.id != null ? { telegramId: String(tgUser.id) } : {}),
      },
    });

    if (!session?.url) return;

    if (isNativeApp) {
      openLink(session.url);
    } else {
      window.location.href = session.url;
    }
  };

  return { isStripePaying, handleStripePayment };
}
