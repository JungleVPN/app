import { Button } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../api';
import { Loading } from '../../components';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { useAuthStore, useSubscriptionInfoStore } from '../../stores';
import { Heading, Paragraph, TgsSticker } from '../../ui';
import { takePendingYookassaPayment, trackPurchaseConversion } from '../../utils';

type RemnawaveApi = ReturnType<typeof useRemnawaveApi>;

// The profile is fetched once and cached, so after an in-app checkout it still
// holds the pre-payment expiry. The webhook that extends it may land a moment
// after the payer does, so poll briefly until the expiry moves.
async function refreshProfile(remnawaveApi: RemnawaveApi) {
  const cachedExpiry = useSubscriptionInfoStore.getState().subscription?.user.expiresAt;
  for (let attempt = 0; attempt < 5; attempt++) {
    const user = await remnawaveApi.getMe().catch(() => null);
    const fresh =
      user && (await remnawaveApi.getSubscriptionInfoByShortUuid(user.shortUuid).catch(() => null));
    if (user) useAuthStore.getState().actions.setRmnUser(user);
    if (fresh) {
      useSubscriptionInfoStore.getState().actions.setSubscriptionInfo({ subscription: fresh });
    }
    if (fresh && fresh.user.expiresAt !== cachedExpiry) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export default function SubscriptionSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { profileSubscriptionPath, paymentFailPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();
  const successStickerUrl = getTelegramStickerUrl(coreEnv.successStickerFileId);
  const [loading, setLoading] = useState<boolean>(true);
  // YooKassa returns the user here whether they paid or cancelled, so a
  // checkout started in this tab has its outcome confirmed before we claim
  // success. Anything other than an outright cancellation stays optimistic:
  // 'pending' resolves through the webhook moments later.
  useEffect(() => {
    const paymentId = takePendingYookassaPayment();

    if (!paymentId) {
      trackPurchaseConversion();
      void refreshProfile(remnawaveApi);
      setLoading(false);
      return;
    }

    setLoading(true);
    paymentsApi
      .getPublicYookassaPaymentStatus(paymentId)
      .then(({ status }) => {
        if (status === 'canceled' || status === 'pending') {
          navigate(paymentFailPath, { replace: true });
          setLoading(false);
        }
        if (status === 'succeeded') {
          trackPurchaseConversion();
          void refreshProfile(remnawaveApi);
          setLoading(false);
        }
      })
      .catch(() => {
        // Status unknown — leave the optimistic success state in place.
      });
  }, [paymentsApi, remnawaveApi, navigate, paymentFailPath]);

  if (loading) return <Loading />;
  return (
    <main className='flex min-h-full flex-1 flex-col items-center px-6 pt-16 pb-10 sm:justify-center sm:pt-10'>
      <div className='flex w-full max-w-md flex-1 flex-col items-center sm:flex-none'>
        <div className='flex flex-1 flex-col items-center justify-center gap-10 sm:flex-none sm:gap-12'>
          {successStickerUrl && (
            <TgsSticker className='h-48 w-48 sm:h-56 sm:w-56' src={successStickerUrl} />
          )}

          <div className='flex flex-col items-center gap-3 text-center'>
            <Heading>{t('subscriptionSuccess.title')}</Heading>
            <Paragraph>{t('subscriptionSuccess.description')}</Paragraph>
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
