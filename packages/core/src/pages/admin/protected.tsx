import { Navigate } from 'react-router';
import { Loading } from '../../components';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';
import { isAdminUser } from '../../utils';
import AdminPaymentsPage from './AdminPaymentsPage';

/**
 * Guard wrapper for the admin payments page.
 * Redirects non-admin users to the subscription tab.
 */
export function ProtectedAdminPaymentsPage() {
  const { profileSubscriptionPath } = useAppRoutes();
  const { tgUser, loading, authUser } = useAuthStoreInfo();

  if (loading) return <Loading />;

  if (!isAdminUser(tgUser, authUser)) {
    return <Navigate to={profileSubscriptionPath} replace />;
  }

  return <AdminPaymentsPage />;
}
