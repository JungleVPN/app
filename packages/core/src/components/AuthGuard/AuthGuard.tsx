import { Navigate } from 'react-router';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';
import { Loading } from '../Loading/Loading';

/**
 * Route guard for protected pages.
 *
 * Passes when either a web user (authUser) or a Telegram user (tgUser) is
 * present. Redirect target comes from `AppRoutesProvider.authGateRedirectPath`.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authGateRedirectPath } = useAppRoutes();
  const { authUser, tgUser, loading } = useAuthStoreInfo();

  if (loading) {
    return <Loading />;
  }

  if (!authUser && !tgUser) {
    return <Navigate to={authGateRedirectPath} replace />;
  }

  return <>{children}</>;
}
