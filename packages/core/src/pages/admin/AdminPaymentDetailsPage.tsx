import { Spinner } from '@heroui/react';
import { backButton } from '@tma.js/sdk-react';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useNavbarStore, usePlatformStore } from '../../stores';
import { Block, Page } from '../../ui';
import { DetailRow } from './components/DetailRow';
import { useAdminPaymentDetails } from './hooks/useAdminPaymentDetails';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return dayjs(date).format('DD MMM YYYY, HH:mm');
}

function formatProvider(provider: string): string {
  if (provider === 'telegram_stars') return 'Telegram Stars';
  if (provider === 'yookassa') return 'YooKassa';
  return provider;
}

export default function AdminPaymentDetailsPage() {
  const navigate = useNavigate();
  const { payment, isLoading, error } = useAdminPaymentDetails();
  const { setNavbarVisible } = useNavbarStore();
  const { platformType } = usePlatformStore();

  useEffect(() => {
    setNavbarVisible(false);
    return () => setNavbarVisible(true);
  }, [setNavbarVisible]);

  useEffect(() => {
    if (platformType !== 'telegram') return;
    backButton.show();
    backButton.onClick(() => navigate(-1));
    return () => backButton.hide();
  }, [platformType, navigate]);

  return (
    <Page title='Payment Details'>
      {isLoading && (
        <div className='flex min-h-[120px] items-center justify-center py-8'>
          <Spinner color='accent' size='md' />
        </div>
      )}

      {error && !isLoading && <p className='mt-6 text-center text-sm text-red-400'>{error}</p>}

      {payment && !isLoading && (
        <Block variant='secondary'>
          <DetailRow label='Payment ID' value={payment.paymentId} copyable />
          <DetailRow label='User ID' value={payment.userId} showSeparatorAbove copyable />
          <DetailRow
            label='Telegram ID'
            value={payment.telegramId != null ? String(payment.telegramId) : null}
            showSeparatorAbove
            copyable
          />
          <DetailRow label='Provider' value={formatProvider(payment.provider)} showSeparatorAbove />
          <DetailRow label='Status' value={payment.status} showSeparatorAbove />
          <DetailRow
            label='Amount'
            value={
              payment.provider === 'telegram_stars'
                ? `${payment.starsAmount ?? '?'} Stars`
                : `${payment.amount ?? '?'} ${payment.currency ?? ''}`.trim()
            }
            showSeparatorAbove
          />
          <DetailRow
            label='Period'
            value={payment.selectedPeriod != null ? `${payment.selectedPeriod} month(s)` : null}
            showSeparatorAbove
          />
          <DetailRow label='Created' value={formatDate(payment.createdAt)} showSeparatorAbove />
          <DetailRow label='Paid At' value={formatDate(payment.paidAt)} showSeparatorAbove />
        </Block>
      )}
    </Page>
  );
}
