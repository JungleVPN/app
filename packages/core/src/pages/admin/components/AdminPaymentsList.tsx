import type { AdminPaymentDto } from '@workspace/types';
import { AdminPaymentRow } from './AdminPaymentRow';

interface AdminPaymentsListProps {
  results: AdminPaymentDto[];
  hasSearched: boolean;
  onSelect?: (payment: AdminPaymentDto) => void;
}

export function AdminPaymentsList({ results, hasSearched, onSelect }: AdminPaymentsListProps) {
  if (!hasSearched) return null;

  if (results.length === 0) {
    return (
      <p className='text-muted mt-6 text-center text-sm'>No payments found.</p>
    );
  }

  return (
    <div className='mt-4 flex w-full flex-col divide-y divide-white/5'>
      {results.map((payment) => (
        <AdminPaymentRow key={payment.paymentId} payment={payment} onSelect={onSelect} />
      ))}
    </div>
  );
}
