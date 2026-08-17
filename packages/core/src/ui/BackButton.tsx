import { Button } from '@heroui/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useBackHandler, usePlatformStore } from '../stores';

interface BackButtonProps {
  className?: string;
}

/**
 * In-page back button for the web profile area.
 *
 * Renders only when a page has configured `useBackButton`, and never on
 * Telegram — which shows its own native back button — so both platforms
 * offer exactly one back affordance driven by the same handler.
 */
export function BackButton({ className }: BackButtonProps) {
  const { t } = useTranslation();
  const { platformType } = usePlatformStore();
  const onBack = useBackHandler();

  if (!onBack || platformType === 'telegram') return null;

  return (
    <Button
      isIconOnly
      size={'md'}
      variant={'tertiary'}
      aria-label={t('a11y.back')}
      className={className}
      onPress={() => onBack()}
    >
      <IconArrowLeft />
    </Button>
  );
}
