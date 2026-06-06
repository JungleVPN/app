import { Button, Input } from '@heroui/react';
import { IconSearch } from '@tabler/icons-react';
import type { AdminPaymentDto } from '@workspace/types';
import { useNavigate } from 'react-router';
import { Page } from '../../ui';
import { AdminPaymentsList } from './components/AdminPaymentsList';
import { useAdminSearch } from './hooks/useAdminSearch';

export default function AdminPaymentsPage() {
  const { query, results, isLoading, error, hasSearched, setQuery, handleSearch } =
    useAdminSearch();
  const navigate = useNavigate();

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleSearch();
  }

  function handleSelect(payment: AdminPaymentDto) {
    void navigate(payment.paymentId);
  }

  return (
    <Page title='Admin — Payments'>
      {/* Search bar */}
      <div className='flex w-full items-center gap-2 rounded-xl py-2'>
        <Input
          type='text'
          className={'w-full'}
          placeholder='paymentId / userId / telegramId'
          value={query}
          variant='secondary'
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete='off'
          spellCheck={false}
        />
        <Button
          isIconOnly
          type='button'
          aria-label='Search'
          isDisabled={isLoading || !query.trim()}
          variant={'primary'}
          onClick={() => void handleSearch()}
        >
          <IconSearch stroke={1.5} />
        </Button>
      </div>

      {error && <p className='mt-3 text-center text-sm text-red-400'>{error}</p>}

      <div className='mt-4 w-full'>
        <AdminPaymentsList
          results={results}
          isLoading={isLoading}
          hasSearched={hasSearched}
          onSelect={handleSelect}
        />
      </div>
    </Page>
  );
}
