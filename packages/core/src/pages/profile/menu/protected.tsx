import { AuthGuard } from '../../../components';
import MenuPage from './MenuPage';

export function ProtectedMenuPage() {
  return (
    <AuthGuard>
      <MenuPage />
    </AuthGuard>
  );
}
