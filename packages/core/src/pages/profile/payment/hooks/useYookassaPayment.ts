import { openLink } from '@tma.js/sdk-react';
import { useRemnawaveApi } from '../../../../api';
import { coreEnv } from '../../../../env';
import { useCreatePaymentSession, useDeleteSavedMethod, useNavigation } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import {
  useAuthStoreActions,
  useAuthStoreInfo,
  usePlatformStore,
  useSavedMethodsStoreActions,
} from '../../../../stores';
import { phCapture, rememberPendingYookassaPayment } from '../../../../utils';

export function useYookassaPayment(selectedPeriod: number) {
  const { rmnUser, tgUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { setYookassaMethods } = useSavedMethodsStoreActions();
  const { platformType, clientPlatform } = usePlatformStore();
  const { profileSubscriptionPath, profilePlansPath } = useAppRoutes();
  const navigate = useNavigation();
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();

  const { isLoading: isPaying, execute: createSession } = useCreatePaymentSession(paymentsApi);
  const { isLoading: isDeleting, execute: deleteMethod } = useDeleteSavedMethod(paymentsApi);
  const isNativeApp =
    platformType !== 'web' && (clientPlatform === 'ios' || clientPlatform === 'android');

  const handleDelete = async (id: string) => {
    await deleteMethod(id);
    phCapture('payment_method_deleted');
    const list = await paymentsApi.getYookassaSavedMethods();
    setYookassaMethods(list);
    if (!list?.some((m) => m.isActive)) {
      navigate(profilePlansPath);
    }
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
      userId: activeUser.id,
      telegramId: tgUser?.id != null ? Number(tgUser.id) : null,
      save_payment_method: true,
      promoCode: promoCode || null,
      userStatus: activeUser.status,
      confirmation: {
        return_url: isNativeApp
          ? coreEnv.tmaAppUrl
          : `${window.location.origin}${profileSubscriptionPath}`,
        type: 'redirect',
      },
      selectedPeriod,
    });

    if (!session?.url) return;

    rememberPendingYookassaPayment(session.id);

    phCapture('checkout_started', { payment_provider: 'yookassa', months: selectedPeriod });
    if (isNativeApp) {
      openLink(session.url);
    } else {
      window.location.href = session.url;
    }
  };

  return { isPaying, isDeleting, handleDelete, handleYookassaPayment };
}
