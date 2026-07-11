import { openLink } from '@tma.js/sdk-react';
import { useRemnawaveApi } from '../../../../api';
import { coreEnv } from '../../../../env';
import { useCreatePaymentSession, useDeleteSavedMethod, useUpdateUser } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import {
  useAuthStoreActions,
  useAuthStoreInfo,
  usePlatformStore,
  useSavedMethodsStoreActions,
} from '../../../../stores';
import { analytics } from '../../../../utils';

export function useYookassaPayment() {
  const { rmnUser, tgUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { setSavedMethods } = useSavedMethodsStoreActions();
  const { platformType, clientPlatform } = usePlatformStore();
  const { paymentReturnPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();

  const { isLoading: isPaying, execute: createSession } = useCreatePaymentSession(paymentsApi);
  const { isLoading: isDeleting, execute: deleteMethod } = useDeleteSavedMethod(paymentsApi);
  const { execute: updateUser } = useUpdateUser(remnawaveApi);

  const isNativeApp =
    platformType !== 'web' && (clientPlatform === 'ios' || clientPlatform === 'android');

  const handleDelete = async (id: string) => {
    if (!rmnUser?.uuid) return;
    await deleteMethod(rmnUser.uuid, id);
    const list = await paymentsApi.getSavedMethods(rmnUser.uuid);
    setSavedMethods(list);
  };

  const handleYookassaPayment = async (email?: string, promoCode?: string) => {
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
