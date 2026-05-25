import { ListBox, Spinner } from '@heroui/react';
import type { AdminPaymentDto } from '@workspace/types';
import type { Key } from 'react';
import { Block } from '../../../ui';
import { AdminPaymentRow } from './AdminPaymentRow';

interface AdminPaymentsListProps {
  results: AdminPaymentDto[];
  isLoading: boolean;
  hasSearched: boolean;
  onSelect?: (payment: AdminPaymentDto) => void;
}

export function AdminPaymentsList({
  results,
  isLoading,
  hasSearched,
  onSelect,
}: AdminPaymentsListProps) {
  if (!hasSearched && !isLoading) return null;

  function handleAction(key: Key) {
    const payment = results.find((p) => p.paymentId === String(key));
    if (payment) onSelect?.(payment);
  }

  return (
    <Block title='Results' variant='secondary' className={'p-2'}>
      {isLoading ? (
        <div className='flex min-h-[120px] items-center justify-center py-8'>
          <Spinner color='accent' size='md' />
        </div>
      ) : results.length === 0 ? (
        <div className='flex min-h-[80px] items-center justify-center px-4 py-6'>
          <p className='text-sm text-muted'>No payments found.</p>
        </div>
      ) : (
        <ListBox
          aria-label='Payment search results'
          selectionMode='none'
          className='w-full p-0'
          onAction={handleAction}
        >
          {results.map((payment) => (
            <AdminPaymentRow key={payment.paymentId} payment={payment} />
          ))}
        </ListBox>
      )}
    </Block>
  );
}
