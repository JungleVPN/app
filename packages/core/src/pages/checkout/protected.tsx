import { AuthGuard } from '../../components';
import { useAppRoutes } from '../../runtime';
import GlobalCheckoutPage from './GlobalCheckoutPage';

/** The profile flow's checkout route: behind the auth guard, falling back into the profile. */
export function ProtectedGlobalCheckoutPage() {
  const { profilePlansPath } = useAppRoutes();

  return (
    <AuthGuard>
      <GlobalCheckoutPage fallbackPath={profilePlansPath} />
    </AuthGuard>
  );
}
