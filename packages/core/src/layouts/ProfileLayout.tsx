import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useRemnawaveApi } from '../api';
import { Navbar } from '../components';
import { coreEnv } from '../env';
import { useNavigation, useSavedMethodsData, useSubscriptionData } from '../hooks';
import { TermsDialog } from '../pages/profile/payment/components/TermsDialog';
import { useAppRoutes } from '../runtime';
import {
  useAuthStore,
  useAuthStoreActions,
  useAuthStoreInfo,
  useNavbarStore,
  usePlatformStore,
  useTermsStore,
} from '../stores';
import { captureReferral } from '../utils';

export function ProfileLayout() {
  const navigate = useNavigation();
  const remnawaveApi = useRemnawaveApi();
  const { tgUser, authUser, rmnUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { getSubscriptionPath } = useAppRoutes();
  const { setNavbarVisible } = useNavbarStore();
  const { isOpen: isTermsOpen } = useTermsStore();
  const { platformType } = usePlatformStore();

  // Any profile route can receive a forwarded `?ref=` (e.g. the TMA header
  // logo link), so re-capture here too before the no-account redirect below
  // reads it back out via withReferralParam.
  useEffect(() => {
    captureReferral();
  }, []);

  useEffect(() => {
    setNavbarVisible(!isTermsOpen);
  }, [isTermsOpen, setNavbarVisible]);

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
    if (!rmnUser || platformType !== 'web') return;
    const browserLang = navigator.language.split('-')[0];
    remnawaveApi
      .getMyMetadata()
      .then((meta) => {
        if (!meta?.lang) {
          remnawaveApi.upsertMyMetadata({ lang: browserLang }).catch(console.error);
        }
      })
      .catch(console.error);
  }, [rmnUser?.uuid, platformType, remnawaveApi, rmnUser]);

  useSubscriptionData(rmnUser?.shortUuid, coreEnv.subpageConfigUuid);
  useSavedMethodsData(rmnUser?.uuid ?? '');

  return (
    <>
      <Outlet />
      {rmnUser && <Navbar />}
      <TermsDialog />
    </>
  );
}
