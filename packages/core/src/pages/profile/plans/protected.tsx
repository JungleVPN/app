import { AuthGuard } from '../../../components';
import PlansPage from './PlansPage';

export function ProtectedPlansPage() {
  return (
    <AuthGuard>
      <PlansPage />
    </AuthGuard>
  );
}
