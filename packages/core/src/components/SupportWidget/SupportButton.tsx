import { Button } from '@heroui/react';
import { IconChevronDown, IconHeadphones, IconHelpCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { SupportPopover } from './SupportPopover';

type SupportButtonProps = {
  /**
   * `icon` is the compact header/footer control. `inline` renders a labeled
   * "headphones + label + chevron" trigger for text-style footers.
   */
  variant?: 'icon' | 'inline';
  /** Label for the `inline` variant. Falls back to the a11y support string. */
  label?: string;
};

export function SupportButton({ variant = 'icon', label }: SupportButtonProps) {
  const { t } = useTranslation();

  if (variant === 'inline') {
    return (
      <SupportPopover
        trigger={
          <Button
            className='h-auto min-w-0 gap-1.5 bg-transparent p-0 text-sm text-muted hover:text-foreground'
            variant='tertiary'
          >
            <IconHeadphones size={18} stroke={1.5} />
            {label ?? t('a11y.support')}
            <IconChevronDown size={16} stroke={1.5} />
          </Button>
        }
      />
    );
  }

  return (
    <SupportPopover
      trigger={
        <Button isIconOnly size='md' variant='tertiary' aria-label={t('a11y.support')}>
          <IconHelpCircle />
        </Button>
      }
    />
  );
}
