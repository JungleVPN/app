import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useRemnawaveApi } from '../api';
import { Navbar } from '../components';
import { applyUserLang } from '../core/i18n';
import { coreEnv } from '../env';
import { useNavigation, useSavedMethodsData, useSubscriptionData } from '../hooks';
import { TermsDialog } from '../pages/profile/payment/components/TermsDialog';
import { useAppRoutes } from '../runtime';
import { useAuthStore, useAuthStoreActions, useAuthStoreInfo } from '../stores';
import { ProfileContainer } from '../ui/containers/ProfileContainer';
import { captureReferral } from '../utils';

export function ProfileLayout() {
  const navigate = useNavigation();
  const remnawaveApi = useRemnawaveApi();
  const { tgUser, authUser, rmnUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { getSubscriptionPath } = useAppRoutes();

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
      <ProfileContainer>
        <Outlet />
      </ProfileContainer>
      {rmnUser && <Navbar />}
      <TermsDialog />
    </>
  );
}
