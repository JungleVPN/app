import { useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Loading, SubscriptionView } from '../../../components';
import type { SubscriptionLoad } from '../../../hooks';
import { useAuthStoreInfo } from '../../../stores';
import { phCapture } from '../../../utils';

export default function ProfileSubscriptionPage() {
  const { rmnUser } = useAuthStoreInfo();
  // ProfileLayout runs the loader and hands its result down.
  const subscriptionLoad = useOutletContext<SubscriptionLoad>();

  useEffect(() => {
    phCapture('subscription_viewed');
  }, []);

  if (!rmnUser) {
    return <Loading />;
  }

  return <SubscriptionView shortUuid={rmnUser.shortUuid} load={subscriptionLoad} />;
}
