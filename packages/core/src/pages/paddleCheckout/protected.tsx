import { AuthGuard } from '../../components';
import { useAppRoutes } from '../../runtime';
import PaddleCheckoutPage from './PaddleCheckoutPage';

/**
 * The profile flow's Paddle checkout: same page, rendered inside ProfileLayout
 * and behind the auth guard, and falling back into the profile rather than to
 * the public plans page when there is no checkout to render.
 */
export function ProtectedPaddleCheckoutPage() {
  const { profilePlansPath } = useAppRoutes();

  return (
    <AuthGuard>
      <PaddleCheckoutPage fallbackPath={profilePlansPath} />
    </AuthGuard>
  );
}
