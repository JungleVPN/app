import { AuthGuard } from '../../../components';
import ExtraDevicePurchasePage from './ExtraDevicePurchasePage';

export function ProtectedExtraDevicePurchasePage() {
  return (
    <AuthGuard>
      <ExtraDevicePurchasePage />
    </AuthGuard>
  );
}
