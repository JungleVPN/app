import { Button, Surface } from '@heroui/react';
import { IconRefresh } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Heading, Paragraph } from '../../ui';
import { phCapture } from '../../utils';
import { SupportButton } from '../SupportWidget/SupportButton';

/** What failed to load — reported with the screen's analytics events. */
export type LoadErrorReason =
  | 'could_not_get_account_data'
  | 'connect_email_to_tg'
  | 'failed_to_load_plans'
  | 'failed_to_fetch_subscription'
  | 'failed_to_fetch_subscription_link'
  | 'failed_to_fetch_subscription_page_config';

interface LoadErrorProps {
  reason: LoadErrorReason;
  onRetry: () => void;
}

/**
 * What a page shows instead of a spinner once its data has failed to load:
 * a spinner that never ends gives the user nothing to do, this gives them a
 * retry and, failing that, support.
 */
export function LoadError({ reason, onRetry }: LoadErrorProps) {
  const { t } = useTranslation();

  useEffect(() => {
    phCapture('load_error_viewed', { reason });
  }, [reason]);

  const retry = () => {
    phCapture('load_error_retry_clicked', { reason });
    onRetry();
  };

  return (
    <Surface
      className='flex w-full flex-col items-center gap-4 py-12 text-center'
      variant='transparent'
      role='alert'
    >
      <Heading as='h2'>{t('loadError.title')}</Heading>
      <Paragraph>{t('loadError.description')}</Paragraph>
      <Button onPress={retry}>
        <IconRefresh size={18} />
        {t('loadError.retry')}
      </Button>
      <SupportButton variant='inline' label={t('loadError.support')} />
    </Surface>
  );
}
