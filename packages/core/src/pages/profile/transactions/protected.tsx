import { AuthGuard } from '../../../components';
import TransactionsPage from './TransactionsPage';

export function ProtectedTransactionsPage() {
  return (
    <AuthGuard>
      <TransactionsPage />
    </AuthGuard>
  );
}
