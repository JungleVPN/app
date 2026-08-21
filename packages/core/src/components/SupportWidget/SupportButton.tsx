import { Button } from '@heroui/react';
import { IconHelpCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { SupportPopover } from './SupportPopover';

export function SupportButton() {
  const { t } = useTranslation();

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
