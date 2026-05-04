import { Loading, SubscriptionView } from '../../../components';
import { useAuthStoreInfo } from '../../../stores';

export default function ProfileSubscriptionPage() {
  const { rmnUser } = useAuthStoreInfo();
  if (!rmnUser) {
    return <Loading />;
  }
  // Data fetching is handled by ProfileLayout above; SubscriptionView just reads the store.
  return <SubscriptionView shortUuid={rmnUser.shortUuid} />;
}
