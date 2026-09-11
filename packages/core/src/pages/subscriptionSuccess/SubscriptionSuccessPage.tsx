import { Button } from '@heroui/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { TgsSticker } from '../../ui';
import { takePendingYookassaPayment } from '../../utils';

export default function SubscriptionSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { profileSubscriptionPath, paymentFailPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();
  const successStickerUrl = getTelegramStickerUrl(coreEnv.successStickerFileId);

  // YooKassa returns the user here whether they paid or cancelled, so a
  // checkout started in this tab has its outcome confirmed before we claim
  // success. Anything other than an outright cancellation stays optimistic:
  // 'pending' resolves through the webhook moments later.
  useEffect(() => {
    const paymentId = takePendingYookassaPayment();
    if (!paymentId) return;

    let abandoned = false;
    paymentsApi
      .getYookassaPaymentStatus(paymentId)
      .then(({ status }) => {
        if (!abandoned && status === 'canceled') {
          navigate(paymentFailPath, { replace: true });
        }
      })
      .catch(() => {
        // Status unknown — leave the optimistic success state in place.
      });

    return () => {
      abandoned = true;
    };
  }, [paymentsApi, navigate, paymentFailPath]);

  return (
    <main className='flex min-h-full flex-1 flex-col items-center px-6 pt-16 pb-10 sm:justify-center sm:pt-10'>
      <div className='flex w-full max-w-md flex-1 flex-col items-center sm:flex-none'>
        <div className='flex flex-1 flex-col items-center justify-center gap-10 sm:flex-none sm:gap-12'>
          {successStickerUrl && (
            <TgsSticker className='h-48 w-48 sm:h-56 sm:w-56' src={successStickerUrl} />
          )}

          <div className='flex flex-col items-center gap-3 text-center'>
            <h1 className='text-xl font-bold tracking-tight text-balance'>
              {t('subscriptionSuccess.title')}
            </h1>
            <p className='text-base text-muted text-balance sm:text-lg'>
              {t('subscriptionSuccess.description')}
            </p>
          </div>
        </div>

        <Button
          fullWidth
          className='mt-12 sm:mt-10'
          size='lg'
          onPress={() => navigate(profileSubscriptionPath, { replace: true })}
        >
          {t('subscriptionSuccess.connect')}
        </Button>
      </div>
    </main>
  );
}
