import { useEffect } from 'react';
import { Loading, SubscriptionView } from '../../../components';
import { useNavigation } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { useAuthStoreInfo } from '../../../stores';
import { isGlobalOrigin, phCapture } from '../../../utils';

export default function ProfileSubscriptionPage() {
  const { rmnUser } = useAuthStoreInfo();
  const navigate = useNavigation();
  const { publicPlansPath } = useAppRoutes();

  useEffect(() => {
    phCapture('subscription_viewed');
  }, []);

  useEffect(() => {
    if (!rmnUser && isGlobalOrigin()) {
      navigate(publicPlansPath);
    }
  }, [navigate, publicPlansPath, rmnUser]);

  if (!rmnUser) {
    return <Loading />;
  }

  return <SubscriptionView shortUuid={rmnUser.shortUuid} />;
}
