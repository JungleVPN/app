import { Description, Label, ListBox } from '@heroui/react';
import { IconStar, IconWallet } from '@tabler/icons-react';
import type { AdminPaymentDto } from '@workspace/types';

function ProviderIcon({ provider }: { provider: AdminPaymentDto['provider'] }) {
  if (provider === 'telegram_stars') {
    return <IconStar stroke={1.25} size={24} />;
  }
  return <IconWallet stroke={1.25} size={24} />;
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    succeeded: 'text-green-500',
    pending: 'text-yellow-500',
    canceled: 'text-red-500',
    refunded: 'text-blue-400',
  };
  return (
    <span className={`text-xs font-medium ${colorMap[status] ?? 'text-muted'}`}>{status}</span>
  );
}

interface AdminPaymentRowProps {
  payment: AdminPaymentDto;
}

export function AdminPaymentRow({ payment }: AdminPaymentRowProps) {
  const amountLabel =
    payment.provider === 'telegram_stars'
      ? `${payment.starsAmount ?? '?'} ⭐`
      : `${payment.amount ?? '?'} ${payment.currency ?? ''}`.trim();

  const subtitle = [payment.userId, payment.telegramId != null ? `tg:${payment.telegramId}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListBox.Item id={payment.paymentId} textValue={payment.paymentId}>
      <span aria-hidden className='shrink-0 text-muted'>
        <ProviderIcon provider={payment.provider} />
      </span>

      <div className='min-w-0 flex-1 flex-col flex'>
        <Label className='w-auto font-medium description truncate'>{payment.paymentId}</Label>
        <Description className='truncate'>{subtitle}</Description>
      </div>

      <div className='flex shrink-0 flex-col items-end gap-0.5'>
        <StatusBadge status={payment.status} />
        <span className='text-xs text-muted'>{amountLabel}</span>
      </div>
    </ListBox.Item>
  );
}
