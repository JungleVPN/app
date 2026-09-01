import type { TSubscriptionPageLanguageCode } from '@workspace/types';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useRemnawaveApi } from '../api';
import { Navbar } from '../components';
import { SubscriptionLinkDialog } from '../components/SubscriptionLinkWidget/SubscriptionLinkDialog';
import { applyUserLang } from '../core/i18n';
import { coreEnv } from '../env';
import { useNavigation, useSavedMethodsData, useSubscriptionData, useToltCapture } from '../hooks';
import { TermsDialog } from '../pages/profile/payment/components/TermsDialog';
import { useAppRoutes, usePaymentsApi } from '../runtime';
import {
  useAuthStore,
  useAuthStoreActions,
  useAuthStoreInfo,
  usePlatformStore,
  useSubscriptionConfigStoreActions,
} from '../stores';
import { Container } from '../ui';
import { captureReferral } from '../utils';

export function ProfileLayout() {
  const navigate = useNavigation();
  const remnawaveApi = useRemnawaveApi();
  const { tgUser, authUser, rmnUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { platformType } = usePlatformStore();
  const { getSubscriptionPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();
  const { setLanguage } = useSubscriptionConfigStoreActions();
  // Hand any affiliate attribution to the backend as soon as the user is known.
  // It lives only in this browser session, but the payment it should credit may
  // settle days later — or be a renewal with no browser involved at all.
  // Self-guarded: no-ops without a referral or once already captured.
  useToltCapture(rmnUser?.id, paymentsApi);

  // Re-capture on every profile-route entry: an invited user can land here
  // after an auth redirect before they've created an account.
  // captureReferral() is first-touch-guarded, so this is a no-op once the
  // cookie is set.
  useEffect(() => {
    captureReferral();
  }, []);

  // Resolve the remnawave user from the available auth identity.
  //
  // Web:  looks up by email (authUser.email); redirects to getSubscriptionPath if not found.
  // TMA:  looks up by telegramId (tgUser.id);  redirects to getSubscriptionPath if not found.
  //
  // Guard: skip the API call if rmnUser is already in the store — this avoids a
  // redundant lookup when the user just came through GetSubscriptionPage, which
  // already resolved and stored the user before navigating here.
  useEffect(() => {
    if (useAuthStore.getState().rmnUser) return;
    if (authUser?.email || tgUser?.id) {
      remnawaveApi
        .getMe()
        .then((user) => {
          setRmnUser(user ?? null);
          if (!user) navigate(getSubscriptionPath);
        })
        .catch(console.error);
    }
  }, [authUser?.email, remnawaveApi, setRmnUser, tgUser?.id, navigate, getSubscriptionPath]);

  useEffect(() => {
    if (!rmnUser) return;
    remnawaveApi
      .getMyMetadata()
      .then((meta) => {
        const currentLang = (
          platformType === 'telegram' && tgUser?.language_code
            ? tgUser.language_code
            : (meta?.lang ?? navigator.language.split('-')[0])
        ) as TSubscriptionPageLanguageCode;
        console.log(tgUser?.language_code);
        console.log(platformType === 'telegram' && tgUser?.language_code);

        applyUserLang(currentLang);
        setLanguage(currentLang);

        if (currentLang !== meta?.lang) {
          remnawaveApi.upsertMyMetadata({ lang: currentLang }).catch(console.error);
        }
      })
      .catch(console.error);
  }, [
    platformType,
    remnawaveApi.getMyMetadata,
    remnawaveApi.upsertMyMetadata,
    rmnUser,
    setLanguage,
    tgUser?.language_code,
  ]);

  useSubscriptionData(rmnUser?.shortUuid, coreEnv.subpageConfigUuid);
  useSavedMethodsData(rmnUser?.id);

  return (
    <>
      <Container maxWidth={'sm'} className={'pt-10 pb-22'}>
        <Outlet />
      </Container>
      {rmnUser && <Navbar />}
      <SubscriptionLinkDialog />
      <TermsDialog />
    </>
  );
}
