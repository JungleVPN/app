import { Navigate } from 'react-router';
import { Loading } from '../../components';
import { coreEnv } from '../../env';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';
import AdminPaymentsPage from './AdminPaymentsPage';

/**
 * Guard wrapper for the admin payments page.
 * Redirects non-admin users to the subscription tab.
 */
export function ProtectedAdminPaymentsPage() {
  const { profileSubscriptionPath } = useAppRoutes();
  const { tgUser, loading, authUser } = useAuthStoreInfo();

  if (loading) return <Loading />;

  const isAdmin =
    (tgUser?.id != null && coreEnv.admins.has(String(tgUser.id))) ||
    (authUser?.email && coreEnv.admins.has(String(authUser.email)));

  if (!isAdmin) {
    return <Navigate to={profileSubscriptionPath} replace />;
  }

  return <AdminPaymentsPage />;
}
