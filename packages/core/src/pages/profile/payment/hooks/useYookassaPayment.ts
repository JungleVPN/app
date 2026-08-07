import { openLink } from '@tma.js/sdk-react';
import { useRemnawaveApi } from '../../../../api';
import { coreEnv } from '../../../../env';
import { useCreatePaymentSession, useDeleteSavedMethod } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import {
  useAuthStoreActions,
  useAuthStoreInfo,
  usePlatformStore,
  useSavedMethodsStoreActions,
} from '../../../../stores';
import { analytics } from '../../../../utils';

export function useYookassaPayment(selectedPeriod: number) {
  const { rmnUser, tgUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { setSavedMethods } = useSavedMethodsStoreActions();
  const { platformType, clientPlatform } = usePlatformStore();
  const { paymentReturnPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();

  const { isLoading: isPaying, execute: createSession } = useCreatePaymentSession(paymentsApi);
  const { isLoading: isDeleting, execute: deleteMethod } = useDeleteSavedMethod(paymentsApi);
  const isNativeApp =
    platformType !== 'web' && (clientPlatform === 'ios' || clientPlatform === 'android');

  const handleDelete = async (id: string) => {
    await deleteMethod(id);
    const list = await paymentsApi.getSavedMethods();
    setSavedMethods(list);
  };

  const handleYookassaPayment = async (email?: string, promoCode?: string) => {
    if (!rmnUser) return;

    let activeUser = rmnUser;

    if (email) {
      const result = await remnawaveApi.linkEmail(email);
      if (result) {
        setRmnUser(result);
        activeUser = result;
      }
    }

    const session = await createSession({
      userId: activeUser.uuid,
      telegramId: tgUser?.id != null ? Number(tgUser.id) : null,
      save_payment_method: true,
      promoCode: promoCode || null,
      userStatus: activeUser.status,
      confirmation: {
        return_url: isNativeApp
          ? coreEnv.tmaAppUrl
          : `${window.location.origin}${paymentReturnPath}`,
        type: 'redirect',
      },
      selectedPeriod,
    });

    if (!session?.url) return;

    analytics.beginCheckout('yookassa');
    if (isNativeApp) {
      openLink(session.url);
    } else {
      window.location.href = session.url;
    }
  };

  return { isPaying, isDeleting, handleDelete, handleYookassaPayment };
}
