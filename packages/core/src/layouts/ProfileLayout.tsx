import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useRemnawaveApi } from '../api';
import { Navbar } from '../components';
import { useSavedMethodsData, useSubscriptionData } from '../hooks';
import { useCoreEnv } from '../runtime';
import { useAuthStoreActions, useAuthStoreInfo } from '../stores';
import { initUser } from '../utils';

export function ProfileLayout() {
  const navigate = useNavigate();
  const { subpageConfigUuid } = useCoreEnv();
  const remnawaveApi = useRemnawaveApi();
  const { tgUser, authUser, rmnUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();

  // Resolve or create the remnawave user once auth identifiers are available.
  useEffect(() => {
    if (authUser?.email || tgUser?.id) {
      initUser(remnawaveApi, { email: authUser?.email, telegramId: tgUser?.id })
        .then((user) => {
          setRmnUser(user ?? null);
          if (!user) {
            navigate('/');
          }
        })
        .catch(console.error);
    }
  }, [authUser?.email, remnawaveApi, setRmnUser, tgUser?.id, navigate]);
  // Pre-fetch both subscription and saved payment methods as soon as rmnUser
  // is known so child routes render immediately without a loading flash on
  // subsequent navigations.

  useSubscriptionData(rmnUser?.shortUuid, subpageConfigUuid);
  useSavedMethodsData(rmnUser?.uuid ?? '');

  return (
    <>
      <Outlet />
      <Navbar />
    </>
  );
}
