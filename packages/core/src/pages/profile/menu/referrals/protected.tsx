import { AuthGuard } from '../../../../components';
import ReferralsPage from './ReferralsPage';

export function ProtectedReferralsPage() {
  return (
    <AuthGuard>
      <ReferralsPage />
    </AuthGuard>
  );
}
