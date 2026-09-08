import { useEffect } from 'react';
import { useParams } from 'react-router';
import { useNavigation, useSubscriptionData } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';

export function useSubscriptionPage() {
  const { profileSubscriptionPath } = useAppRoutes();
  const navigate = useNavigation();
  const { shortUuid } = useParams<{ shortUuid: string }>();
  const { authUser, tgUser } = useAuthStoreInfo();

  if (!shortUuid) {
    throw new Error('shortUuid must be defined');
  }
  const { error } = useSubscriptionData(shortUuid ?? '');

  useEffect(() => {
    if (authUser || tgUser) navigate(profileSubscriptionPath);
  }, [authUser, tgUser, navigate, profileSubscriptionPath]);

  return { shortUuid, error };
}
