import { Button, Surface } from '@heroui/react';
import { miniApp } from '@tma.js/sdk-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Heading, Paragraph } from '../../ui';
import { phCapture } from '../../utils';

/**
 * Shown in the mini app once the backend stops accepting its Telegram launch
 * data, which it does after a fixed age. The data only renews when the app is
 * opened again, so the one useful action is closing it.
 */
export function SessionExpired() {
  const { t } = useTranslation();

  useEffect(() => {
    phCapture('session_expired_viewed');
  }, []);

  return (
    <Container className={'mt-8'}>
      <Surface
        className='flex rounded-3xl w-full flex-col items-center gap-4 p-8 bg-background text-center'
        variant='transparent'
        role='alert'
      >
        <Heading as='h2'>{t('sessionExpired.title')}</Heading>
        <Paragraph>{t('sessionExpired.description')}</Paragraph>
        <Button onPress={() => miniApp.close()}>{t('sessionExpired.close')}</Button>
      </Surface>
    </Container>
  );
}
