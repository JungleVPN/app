import { AuthGuard } from '../../../components';
import DevicesPage from './DevicesPage';

export function ProtectedDevicesPage() {
  return (
    <AuthGuard>
      <DevicesPage />
    </AuthGuard>
  );
}
