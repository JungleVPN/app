import { useOverlayState } from '@heroui/react';
import { invoice } from '@tma.js/sdk-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../../../api';
import { coreEnv } from '../../../../env';
import { useCreateTelegramStarsInvoice } from '../../../../hooks';
import { usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo, usePlatformStore, useSubscriptionInfoStore } from '../../../../stores';

export function useTelegramStarsPayment(selectedPeriod: number) {
  const { t } = useTranslation();
  const { rmnUser } = useAuthStoreInfo();
  const { platformType } = usePlatformStore();
  const { extraDevicePriceStars } = coreEnv;
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();
  const { setSubscriptionInfo } = useSubscriptionInfoStore((state) => state.actions);

  const { isLoading: isStarsPaying, execute: createStarsInvoice } =
    useCreateTelegramStarsInvoice(paymentsApi);
  const successState = useOverlayState();
  const [starsError, setStarsError] = useState<string | null>(null);

  const isTma = platformType !== 'web';
  const starsEnabled = isTma && extraDevicePriceStars > 0;

  const handleStarsPayment = async (promoCode?: string) => {
    if (!rmnUser?.id) return;
    setStarsError(null);

    const result = await createStarsInvoice({
      userId: rmnUser.id,
      telegramId: rmnUser.telegramId,
      selectedPeriod,
      title: t('payment.stars.invoiceTitle', { period: selectedPeriod }),
      description: t('payment.stars.invoiceDescription', { period: selectedPeriod }),
      promoCode: promoCode || null,
      userStatus: rmnUser.status,
    });

    if (!result?.invoiceLink) {
      setStarsError(t('payment.stars.errorFetch'));
      return;
    }

    try {
      const status = await invoice.openUrl(result.invoiceLink);
      if (status === 'paid') {
        successState.open();
        const originalExpireAt = useSubscriptionInfoStore.getState().subscription?.user.expiresAt;
        // Poll until the backend webhook updates the expiry, up to ~5s total.
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise((r) => setTimeout(r, 1000));
          const fresh = await remnawaveApi.getSubscriptionInfoByShortUuid(rmnUser.shortUuid);
          if (fresh) {
            setSubscriptionInfo({ subscription: fresh });
            if (fresh.user.expiresAt !== originalExpireAt) break;
          }
        }
      }
    } catch {
      // User dismissed the invoice or SDK not available — silently ignore.
    }
  };

  return {
    starsEnabled,
    extraDevicePriceStars,
    starsError,
    isStarsPaying,
    successState,
    handleStarsPayment,
  };
}
