import { miniApp, openLink } from '@tma.js/sdk-react';
import { useRemnawaveApi } from '../../../../api';
import { coreEnv } from '../../../../env';
import {
  useCreatePaymentSession,
  useDeleteSavedMethod,
  useUpdateUser,
} from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import {
  useAuthStoreActions,
  useAuthStoreInfo,
  usePlatformStore,
  useSavedMethodsStoreActions,
} from '../../../../stores';

export function useYookassaPayment() {
  const { rmnUser, tgUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { setSavedMethods } = useSavedMethodsStoreActions();
  const { platformType, clientPlatform } = usePlatformStore();
  const { paymentReturnPath } = useAppRoutes();
  const { allowedAmounts } = coreEnv;
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

  const handleExtend = async (email?: string) => {
    if (!rmnUser) return;

    let activeUser = rmnUser;

    if (email && !rmnUser.email) {
      const byEmail = await remnawaveApi.getUserByEmail({ email });
      const existingWebUser = byEmail?.[0];

      if (existingWebUser && existingWebUser.uuid !== rmnUser.uuid) {
        // TMA user has a pre-existing web account — link Telegram ID to it and adopt it.
        const linked = await updateUser({
          uuid: existingWebUser.uuid,
          telegramId: tgUser?.id != null ? Number(tgUser.id) : undefined,
        });
        if (linked) {
          setRmnUser(linked);
          activeUser = linked;
        }
      } else {
        const updated = await updateUser({ uuid: rmnUser.uuid, email });
        if (updated) {
          setRmnUser(updated);
          activeUser = updated;
        }
      }
    }

    const session = await createSession({
      userId: activeUser.uuid,
      save_payment_method: true,
      confirmation: {
        return_url: isNativeApp
          ? import.meta.env.VITE_TMA_APP_URL
          : `${window.location.origin}${paymentReturnPath}`,
        type: 'redirect',
      },
    });

    if (!session?.url) return;

    if (isNativeApp) {
      openLink(session.url);
      miniApp.close();
    } else {
      window.location.href = session.url;
    }
  };

  return { allowedAmounts, isPaying, isDeleting, handleDelete, handleExtend };
}
