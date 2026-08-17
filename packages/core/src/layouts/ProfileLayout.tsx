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
import { useAuthStore, useAuthStoreActions, useAuthStoreInfo } from '../stores';
import { Container } from '../ui';
import { captureReferral } from '../utils';

export function ProfileLayout() {
  const navigate = useNavigation();
  const remnawaveApi = useRemnawaveApi();
  const { tgUser, authUser, rmnUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { getSubscriptionPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();

  // Hand any affiliate attribution to the backend as soon as the user is known.
  // It lives only in this browser session, but the payment it should credit may
  // settle days later — or be a renewal with no browser involved at all.
  // Self-guarded: no-ops without a referral or once already captured.
  useToltCapture(rmnUser?.uuid, paymentsApi);

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
  // Pre-fetch both subscription and saved payment methods as soon as rmnUser
  // is known so child routes render immediately without a loading flash on
  // subsequent navigations.

  useEffect(() => {
    if (!rmnUser) return;
    remnawaveApi
      .getMyMetadata()
      .then((meta) => {
        if (meta?.lang) {
          applyUserLang(String(meta.lang));
        } else {
          const currentLang = navigator.language.split('-')[0];
          remnawaveApi.upsertMyMetadata({ lang: currentLang }).catch(console.error);
        }
      })
      .catch(console.error);
  }, [rmnUser?.uuid, remnawaveApi, rmnUser]);

  useSubscriptionData(rmnUser?.shortUuid, coreEnv.subpageConfigUuid);
  useSavedMethodsData(rmnUser?.uuid ?? '');

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
