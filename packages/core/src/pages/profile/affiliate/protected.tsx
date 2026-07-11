import { AuthGuard } from '../../../components';
import AffiliatePage from './AffiliatePage';

export function ProtectedAffiliatePage() {
  return (
    <AuthGuard>
      <AffiliatePage />
    </AuthGuard>
  );
}
