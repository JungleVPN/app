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
  useTermsStore,
} from '../stores';
import { captureReferral, initUser } from '../utils';

export function ProfileLayout() {
  const navigate = useNavigation();
  const remnawaveApi = useRemnawaveApi();
  const { tgUser, authUser, rmnUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { getSubscriptionPath } = useAppRoutes();
  const { setNavbarVisible } = useNavbarStore();
  const { isOpen: isTermsOpen } = useTermsStore();

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
      initUser(remnawaveApi, { email: authUser?.email, telegramId: tgUser?.id })
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
