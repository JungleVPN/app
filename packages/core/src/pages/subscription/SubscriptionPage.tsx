import { Surface } from '@heroui/react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { SubscriptionView } from '../../components';
import { coreEnv } from '../../env';
import { useSubscriptionData } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';

export default function SubscriptionPage() {
  const { subpageConfigUuid } = coreEnv;
  const { subscriptionPortalPath } = useAppRoutes();
  const navigate = useNavigate();
  const { shortUuid } = useParams<{ shortUuid: string }>();

  const { authUser, tgUser } = useAuthStoreInfo();

  // SubscriptionPage is the public route — it owns its own fetch.
  // (ProfileLayout is not an ancestor here on the web router.)
  const { error } = useSubscriptionData(shortUuid ?? '', subpageConfigUuid);

  useEffect(() => {
    if (authUser || tgUser) navigate(subscriptionPortalPath);
  }, [authUser, tgUser, navigate, subscriptionPortalPath]);

  if (!shortUuid) {
    return null;
  }

  return (
    <Surface variant='transparent'>
      <SubscriptionView shortUuid={shortUuid} error={error} />
    </Surface>
  );
}
