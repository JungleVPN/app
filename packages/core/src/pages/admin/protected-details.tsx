import { Navigate } from 'react-router';
import { Loading } from '../../components';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';
import { isAdminUser } from '../../utils';
import AdminPaymentDetailsPage from './AdminPaymentDetailsPage';

export function ProtectedAdminPaymentDetailsPage() {
  const { profileSubscriptionPath } = useAppRoutes();
  const { tgUser, authUser, loading } = useAuthStoreInfo();

  if (loading) return <Loading />;

  if (!isAdminUser(tgUser, authUser)) {
    return <Navigate to={profileSubscriptionPath} replace />;
  }

  return <AdminPaymentDetailsPage />;
}
