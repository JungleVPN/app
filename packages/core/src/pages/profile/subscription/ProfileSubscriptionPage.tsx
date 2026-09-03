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
  // Data fetching is handled by ProfileLayout above; SubscriptionView just reads the store.
  return <SubscriptionView shortUuid={rmnUser.shortUuid} />;
}
