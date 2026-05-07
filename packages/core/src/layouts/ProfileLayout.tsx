import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useRemnawaveApi } from '../api';
import { Navbar } from '../components';
import { coreEnv } from '../env';
import { useSavedMethodsData, useSubscriptionData } from '../hooks';
import { useAppRoutes } from '../runtime';
import { useAuthStore, useAuthStoreActions, useAuthStoreInfo } from '../stores';
import { initUser } from '../utils';

export function ProfileLayout() {
  const navigate = useNavigate();
  const remnawaveApi = useRemnawaveApi();
  const { tgUser, authUser, rmnUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();
  const { setupPath } = useAppRoutes();

  // Resolve the remnawave user from the available auth identity.
  //
  // Web:  looks up by email (authUser.email); redirects to setupPath if not found.
  // TMA:  looks up by telegramId (tgUser.id);  redirects to setupPath if not found.
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
          if (!user) navigate(setupPath);
        })
        .catch(console.error);
    }
  }, [authUser?.email, remnawaveApi, setRmnUser, tgUser?.id, navigate, setupPath]);
  // Pre-fetch both subscription and saved payment methods as soon as rmnUser
  // is known so child routes render immediately without a loading flash on
  // subsequent navigations.

  useSubscriptionData(rmnUser?.shortUuid, coreEnv.subpageConfigUuid);
  useSavedMethodsData(rmnUser?.uuid ?? '');

  return (
    <>
      <Outlet />
      {rmnUser && <Navbar />}
    </>
  );
}
