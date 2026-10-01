import { Button } from '@heroui/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { useNavigation } from '../../hooks';
import { Heading, Paragraph, TgsSticker } from '../../ui';
import { checkoutEventProperties, PRICING_PATH, phCapture, takePendingCheckout } from '../../utils';

export default function SubscriptionFailPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const failStickerUrl = getTelegramStickerUrl(coreEnv.failStickerFileId);

  // Reports how the checkout this tab started ended; reading it also keeps a
  // later visit to the success page from reporting it as a purchase. The backend
  // reports payment_failed itself, from the provider's webhook.
  useEffect(() => {
    const checkout = takePendingCheckout();
    if (!checkout) return;
    phCapture('checkout_result', { ...checkoutEventProperties(checkout), status: 'failed' });
  }, []);

  return (
    <main className='flex min-h-full flex-1 flex-col items-center px-6 pt-16 pb-10 sm:justify-center sm:pt-10'>
      <div className='flex w-full max-w-md flex-1 flex-col items-center sm:flex-none'>
        <div className='flex flex-1 flex-col items-center justify-center gap-10 sm:flex-none sm:gap-12'>
          {failStickerUrl && (
            <TgsSticker className='h-48 w-48 sm:h-56 sm:w-56' src={failStickerUrl} />
          )}

          <div className='flex flex-col items-center gap-3 text-center'>
            <Heading>{t('subscriptionFail.title')}</Heading>
            <Paragraph>{t('subscriptionFail.description')}</Paragraph>
          </div>
        </div>

        <Button
          fullWidth
          className='mt-12 sm:mt-10'
          size='lg'
          onPress={() => navigate(PRICING_PATH, { replace: true })}
        >
          {t('subscriptionFail.retry')}
        </Button>
      </div>
    </main>
  );
}
