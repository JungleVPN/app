import { Description, Label, ListBox } from '@heroui/react';
import { IconCreditCard, IconStar, IconWallet } from '@tabler/icons-react';
import type { AdminPaymentDto } from '@workspace/types';
import { toDateString } from '../../../../utils/date';

function ProviderIcon({ provider }: { provider: AdminPaymentDto['provider'] }) {
  if (provider === 'telegram_stars') {
    return <IconStar stroke={1.25} size={24} />;
  }
  if (provider === 'stripe') {
    return <IconCreditCard stroke={1.25} size={24} />;
  }
  return <IconWallet stroke={1.25} size={24} />;
}

function toPaymentProvider(provider: AdminPaymentDto['provider']): string {
  switch (provider) {
    case 'telegram_stars':
      return 'Telegram Stars';
    case 'yookassa':
      return 'YooKassa';
    case 'stripe':
      return 'Stripe';
    default:
      return provider;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    paid: 'text-green-500',
    succeeded: 'text-green-500',
    pending: 'text-yellow-500',
    canceled: 'text-red-500',
    refunded: 'text-blue-400',
  };
  return (
    <span className={`text-xs font-medium ${colorMap[status] ?? 'text-muted'}`}>{status}</span>
  );
}

interface PaymentRowProps {
  payment: AdminPaymentDto;
}

export function PaymentRow({ payment }: PaymentRowProps) {
  const amountLabel =
    payment.provider === 'telegram_stars'
      ? `${payment.starsAmount ?? '?'} ⭐`
      : `${payment.amount ?? '?'} ${payment.currency ?? ''}`.trim();

  return (
    <ListBox.Item id={payment.paymentId} textValue={payment.paymentId}>
      <span aria-hidden className='shrink-0 text-muted'>
        <ProviderIcon provider={payment.provider} />
      </span>

      <div className='min-w-0 flex-1 flex-col flex'>
        <Label className='w-auto font-medium description truncate'>
          {toPaymentProvider(payment.provider)}
        </Label>
        <Description className='truncate'>
          {toDateString(payment.paidAt || payment.createdAt)}
        </Description>
      </div>

      <div className='flex shrink-0 flex-col items-end gap-0.5'>
        <StatusBadge status={payment.status} />
        <span className='text-xs text-muted'>{amountLabel}</span>
      </div>
    </ListBox.Item>
  );
}
