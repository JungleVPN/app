import { Button, Separator } from '@heroui/react';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useClipboard } from '../../../../hooks';

interface DetailRowProps {
  label: string;
  value: string | null | undefined;
  showSeparatorAbove?: boolean;
  /** When true renders a copy icon that writes value to clipboard */
  copyable?: boolean;
}

export function DetailRow({ label, value, showSeparatorAbove, copyable }: DetailRowProps) {
  const { t } = useTranslation();
  const { copy, copied } = useClipboard({ timeout: 2000 });

  const displayValue = value ?? '—';

  return (
    <>
      {showSeparatorAbove && <Separator className='shrink-0' variant='default' />}

      <div className='flex min-h-[52px] items-center gap-3 px-4 py-2.5'>
        <div className='min-w-0 flex-1'>
          <p className='text-xs font-semibold tracking-wide text-muted uppercase'>{label}</p>
          <p className='mt-0.5 break-all text-sm font-medium leading-tight text-foreground'>
            {displayValue}
          </p>
        </div>

        {copyable && value != null && (
          <Button
            aria-label={t('transactions.details.copy', { label })}
            isIconOnly
            size='sm'
            variant='tertiary'
            onPress={() => void copy(value)}
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </Button>
        )}
      </div>
    </>
  );
}
