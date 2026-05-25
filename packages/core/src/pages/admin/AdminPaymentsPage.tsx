import { IconSearch } from '@tabler/icons-react';
import { Page } from '../../ui';
import { AdminPaymentsList } from './components/AdminPaymentsList';
import { useAdminSearch } from './hooks/useAdminSearch';

export default function AdminPaymentsPage() {
  const { query, results, isLoading, error, hasSearched, setQuery, handleSearch } =
    useAdminSearch();

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleSearch();
  }

  return (
    <Page title='Admin — Payments' subtitle='Search by payment ID, user ID or Telegram ID'>
      {/* Search bar */}
      <div className='flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2'>
        <input
          type='text'
          className='min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500'
          placeholder='paymentId / userId / telegramId'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete='off'
          spellCheck={false}
        />
        <button
          type='button'
          aria-label='Search'
          disabled={isLoading || !query.trim()}
          className='flex shrink-0 items-center justify-center rounded-lg p-1 transition-opacity disabled:opacity-40 active:opacity-60'
          onClick={() => void handleSearch()}
        >
          <IconSearch className='size-5' stroke={1.5} />
        </button>
      </div>

      {/* Error */}
      {error && <p className='mt-3 text-center text-sm text-red-400'>{error}</p>}

      {/* Loading */}
      {isLoading && <p className='text-muted mt-6 text-center text-sm'>Searching…</p>}

      {/* Results */}
      {!isLoading && (
        <AdminPaymentsList results={results} hasSearched={hasSearched} />
      )}
    </Page>
  );
}
