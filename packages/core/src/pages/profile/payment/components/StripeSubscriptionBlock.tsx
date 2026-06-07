import { Button } from '@heroui/react';
import { IconExternalLink } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Block } from '../../../../ui';

interface StripeSubscriptionBlockProps {
  /** A freshly-minted Stripe Billing Portal URL, or null while loading/unavailable. */
  portalUrl: string | null;
  onManage: () => void;
}

/**
 * Shown when the user has an active Stripe subscription. Surfaces the active
 * status and a button that opens the Stripe Billing Portal for self-service
 * management (change plan / payment method / cancel).
 */
export function StripeSubscriptionBlock({ portalUrl, onManage }: StripeSubscriptionBlockProps) {
  const { t } = useTranslation();

  return (
    <Block
      title={t('payment.stripeSubscriptionHeading')}
      description={t('payment.stripeSubscriptionDescription')}
      variant='secondary'
    >
      <div className='flex items-center justify-between gap-3 p-4'>
        <span className='inline-flex items-center gap-2 text-sm font-medium text-success'>
          <span className='size-2 rounded-full bg-success' aria-hidden='true' />
          {t('payment.stripeSubscriptionActive')}
        </span>
        <Button size='sm' variant='secondary' isDisabled={!portalUrl} onPress={onManage}>
          {t('payment.stripeManageButton')}
          <IconExternalLink size={16} stroke={2} />
        </Button>
      </div>
    </Block>
  );
}
