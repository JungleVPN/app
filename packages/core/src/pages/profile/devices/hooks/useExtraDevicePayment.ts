import { openLink } from '@tma.js/sdk-react';
import { coreEnv } from '../../../../env';
import { useCreatePaymentSession } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo, usePlatformStore } from '../../../../stores';

export function useExtraDevicePayment() {
  const { rmnUser, tgUser } = useAuthStoreInfo();
  const { platformType, clientPlatform } = usePlatformStore();
  const { paymentReturnPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();

  const { isLoading: isPaying, execute: createSession } = useCreatePaymentSession(paymentsApi);

  const isNativeApp =
    platformType !== 'web' && (clientPlatform === 'ios' || clientPlatform === 'android');

  const handlePay = async () => {
    if (!rmnUser) return;

    const session = await createSession({
      userId: rmnUser.uuid,
      telegramId: tgUser?.id != null ? Number(tgUser.id) : null,
      purpose: 'extra_device',
      save_payment_method: false,
      confirmation: {
        return_url: isNativeApp
          ? coreEnv.tmaAppUrl
          : `${window.location.origin}${paymentReturnPath}`,
        type: 'redirect',
      },
    });

    if (!session?.url) return;

    if (isNativeApp) {
      openLink(session.url);
    } else {
      window.location.href = session.url;
    }
  };

  return { isPaying, handlePay };
}
