import { useEffect } from 'react';
import { Loading, SubscriptionView } from '../../../components';
import { useAuthStoreInfo } from '../../../stores';
import { phCapture } from '../../../utils';

export default function ProfileSubscriptionPage() {
  const { rmnUser } = useAuthStoreInfo();

  useEffect(() => {
    phCapture('subscription_viewed');
  }, []);

  if (!rmnUser) {
    return <Loading />;
  }

  return <SubscriptionView shortUuid={rmnUser.shortUuid} />;
}
