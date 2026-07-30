import { Navigate, useLocation } from 'react-router';
import { useAppRoutes } from '../../runtime';
import { useAuthStoreInfo } from '../../stores';
import { Loading } from '../Loading/Loading';

/**
 * Route guard for protected pages.
 *
 * Passes when either a web user (authUser) or a Telegram user (tgUser) is
 * present. Redirect target comes from `AppRoutesProvider.authGateRedirectPath`.
 * Appends `?to=<current path>` so the login flow can return the user here.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authGateRedirectPath } = useAppRoutes();
  const { authUser, tgUser, loading } = useAuthStoreInfo();
  const location = useLocation();

  if (loading) {
    return <Loading />;
  }

  if (!authUser && !tgUser) {
    const to = `${location.pathname}${location.search}`;
    return <Navigate to={`${authGateRedirectPath}?to=${encodeURIComponent(to)}`} replace />;
  }

  return <>{children}</>;
}
