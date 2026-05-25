import { IconStar } from '@tabler/icons-react';
import type { AdminPaymentDto } from '@workspace/types';
import IconPig from '../../../assets/icons/payment-tab-icon.svg?react';

interface AdminPaymentRowProps {
  payment: AdminPaymentDto;
  onSelect?: (payment: AdminPaymentDto) => void;
}

function ProviderIcon({ provider }: { provider: AdminPaymentDto['provider'] }) {
  if (provider === 'telegram_stars') {
    return <IconStar className='size-5 shrink-0 text-yellow-400' stroke={1.5} />;
  }
  return <IconPig className='size-5 shrink-0' />;
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    succeeded: 'text-green-500',
    pending: 'text-yellow-500',
    canceled: 'text-red-500',
    refunded: 'text-blue-400',
  };
  const color = colorMap[status] ?? 'text-muted';
  return <span className={`text-xs font-medium ${color}`}>{status}</span>;
}

export function AdminPaymentRow({ payment, onSelect }: AdminPaymentRowProps) {
  const amountLabel =
    payment.provider === 'telegram_stars'
      ? `${payment.starsAmount ?? '?'} ⭐`
      : `${payment.amount ?? '?'} ${payment.currency ?? ''}`.trim();

  return (
    <button
      type='button'
      className='flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors active:bg-white/5'
      onClick={() => onSelect?.(payment)}
    >
      <ProviderIcon provider={payment.provider} />

      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{payment.paymentId}</p>
        <p className='text-muted truncate text-xs'>
          {payment.userId}
          {payment.telegramId != null ? ` · tg:${payment.telegramId}` : ''}
        </p>
      </div>

      <div className='flex shrink-0 flex-col items-end gap-0.5'>
        <StatusBadge status={payment.status} />
        <span className='text-muted text-xs'>{amountLabel}</span>
      </div>
    </button>
  );
}
