import { Button, Surface } from '@heroui/react';
import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { Paragraph } from '../../ui/Paragraph';

export function ErrorConnection() {
  const { t } = useI18nextTranslation();

  return (
    <Surface className='flex flex-col items-center gap-6' variant='transparent'>
      <Surface
        className='w-[200px] text-center text-6xl text-warning'
        variant='transparent'
        aria-hidden
      >
        &#x26A0;
      </Surface>
      <Paragraph>{t('main.page.component.error-connect')}</Paragraph>
      <Button variant='secondary' onPress={() => window.location.reload()}>
        {t('main.page.component.refresh')}
      </Button>
    </Surface>
  );
}
