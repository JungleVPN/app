import { AuthGuard } from '../../../components';
import TransactionDetailsPage from './TransactionDetailsPage';

export function ProtectedTransactionDetailsPage() {
  return (
    <AuthGuard>
      <TransactionDetailsPage />
    </AuthGuard>
  );
}
