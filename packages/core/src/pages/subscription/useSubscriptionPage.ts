import { useEffect } from 'react';
import { useParams } from 'react-router';
import { coreEnv } from '../../env';
import { useNavigation, useSubscriptionData } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';

export function useSubscriptionPage() {
  const { subpageConfigUuid } = coreEnv;
  const { profileSubscriptionPath } = useAppRoutes();
  const navigate = useNavigation();
  const { shortUuid } = useParams<{ shortUuid: string }>();
  const { authUser, tgUser } = useAuthStoreInfo();
  const { error } = useSubscriptionData(shortUuid ?? '', subpageConfigUuid);

  useEffect(() => {
    if (authUser || tgUser) navigate(profileSubscriptionPath);
  }, [authUser, tgUser, navigate, profileSubscriptionPath]);

  return { shortUuid, error };
}
