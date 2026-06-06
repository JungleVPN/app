import { Button, Input, ListBox, Spinner } from '@heroui/react';
import { IconSearch } from '@tabler/icons-react';
import type { AdminPaymentDto } from '@workspace/types';
import { Key, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useBackButton } from '../../../hooks';
import { useAuthStoreInfo, useNavbarStore } from '../../../stores';
import { Block } from '../../../ui';
import { isAdminUser } from '../../../utils';
import { PaymentRow } from './components/PaymentRow';
import { useAdminSearch } from './hooks/useAdminSearch';
import { useUserTransactions } from './hooks/useUserTransactions';

export default function TransactionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tgUser, authUser } = useAuthStoreInfo();
  const isAdmin = isAdminUser(tgUser, authUser);

  const { setNavbarVisible } = useNavbarStore();

  useEffect(() => {
    setNavbarVisible(false);
    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  useBackButton(() => navigate(-1));

  const { transactions, isLoading: userLoading } = useUserTransactions();
  const {
    query,
    results,
    isLoading: searchLoading,
    error: searchError,
    hasSearched,
    setQuery,
    handleSearch,
  } = useAdminSearch();

  // When admin has triggered a search, replace user list with search results.
  const isSearchMode = isAdmin && (hasSearched || searchLoading);
  const activeItems: AdminPaymentDto[] = isSearchMode ? results : transactions;
  const activeLoading = isSearchMode ? searchLoading : userLoading;

  function handleSelect(key: Key) {
    void navigate(String(key));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleSearch();
  }

  const listContent = activeLoading ? (
    <div className='flex min-h-[120px] items-center justify-center py-8'>
      <Spinner color='accent' size='md' />
    </div>
  ) : activeItems.length === 0 ? (
    <p className='px-4 py-6 text-center text-sm text-muted'>
      {isSearchMode ? t('transactions.noPaymentsFound') : t('transactions.noTransactions')}
    </p>
  ) : (
    <ListBox
      aria-label={t('transactions.pageTitle')}
      selectionMode='none'
      className='w-full p-0'
      onAction={handleSelect}
    >
      {activeItems.map((item) => (
        <PaymentRow key={item.paymentId} payment={item} />
      ))}
    </ListBox>
  );

  return (
    <>
      {isAdmin && (
        <div className='flex w-full items-center gap-2 rounded-xl py-2'>
          <Input
            type='text'
            className='w-full'
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
            aria-label={t('transactions.searchAriaLabel')}
            isDisabled={searchLoading || !query.trim()}
            variant={'primary'}
            onClick={() => void handleSearch()}
          >
            <IconSearch stroke={1.5} />
          </Button>
        </div>
      )}

      {searchError && <p className='mt-3 text-center text-sm text-red-400'>{searchError}</p>}

      <Block className={'p-2'} title={t('transactions.pageTitle')}>
        {listContent}
      </Block>
    </>
  );
}
