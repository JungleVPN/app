import { Spinner } from '@heroui/react';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBackButton, useNavigation } from '../../../../hooks';
import { useAuthStore, useNavbarStore } from '../../../../stores';
import { Block, Page } from '../../../../ui';
import { isAdminUser } from '../../../../utils';
import { DetailRow } from './components/DetailRow';
import { useTransactionDetails } from './hooks/useTransactionDetails';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return dayjs(date).format('DD MMM YYYY, HH:mm');
}

function formatProvider(provider: string): string {
  if (provider === 'telegram_stars') return 'Telegram Stars';
  if (provider === 'yookassa') return 'YooKassa';
  if (provider === 'stripe') return 'Stripe';
  return provider;
}

export default function TransactionDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { payment, isLoading, error } = useTransactionDetails();
  const { setNavbarVisible } = useNavbarStore();
  const { tgUser, authUser } = useAuthStore();

  const isAdmin = isAdminUser(tgUser, authUser);

  useEffect(() => {
    setNavbarVisible(false);
    return () => setNavbarVisible(true);
  }, [setNavbarVisible]);

  useBackButton(() => navigate(-1));

  return (
    <Page title={t('transactions.details.pageTitle')}>
      {isLoading && (
        <div className='flex min-h-30 items-center justify-center py-8'>
          <Spinner color='accent' size='md' />
        </div>
      )}

      {error && !isLoading && <p className='mt-6 text-center text-sm text-red-400'>{error}</p>}

      {payment && !isLoading && (
        <Block variant='secondary' title={t('transactions.details.title')}>
          {isAdmin && (
            <DetailRow
              label={t('transactions.details.paymentId')}
              value={payment.paymentId}
              copyable
            />
          )}
          <DetailRow
            label={t('transactions.details.userId')}
            value={String(payment.userId)}
            showSeparatorAbove
            copyable
          />
          <DetailRow
            label={t('transactions.details.telegramId')}
            value={payment.telegramId != null ? String(payment.telegramId) : null}
            showSeparatorAbove
            copyable
          />
          <DetailRow
            label={t('transactions.details.provider')}
            value={formatProvider(payment.provider)}
            showSeparatorAbove
          />
          <DetailRow
            label={t('transactions.details.status')}
            value={payment.status}
            showSeparatorAbove
          />
          <DetailRow
            label={t('transactions.details.amount')}
            value={
              payment.provider === 'telegram_stars'
                ? t('transactions.details.starsValue', { amount: payment.starsAmount ?? '?' })
                : `${payment.amount ?? '?'} ${payment.currency ?? ''}`.trim()
            }
            showSeparatorAbove
          />
          <DetailRow
            label={t('transactions.details.period')}
            value={
              payment.selectedPeriod != null
                ? t('transactions.details.periodValue', { count: payment.selectedPeriod })
                : null
            }
            showSeparatorAbove
          />
          <DetailRow
            label={t('transactions.details.createdAt')}
            value={formatDate(payment.createdAt)}
            showSeparatorAbove
          />
          <DetailRow
            label={t('transactions.details.paidAt')}
            value={formatDate(payment.paidAt)}
            showSeparatorAbove
          />
        </Block>
      )}
    </Page>
  );
}
