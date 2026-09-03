import { useOverlayState } from '@heroui/react';
import { invoice } from '@tma.js/sdk-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coreEnv } from '../../../../env';
import { useCreateTelegramStarsInvoice } from '../../../../hooks';
import { usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo, usePlatformStore } from '../../../../stores';
import { phCapture } from '../../../../utils';

export function useExtraDeviceStarsPayment() {
  const { t } = useTranslation();
  const { rmnUser } = useAuthStoreInfo();
  const { platformType } = usePlatformStore();
  const { extraDevicePriceStars } = coreEnv;
  const paymentsApi = usePaymentsApi();

  const { isLoading: isStarsPaying, execute: createStarsInvoice } =
    useCreateTelegramStarsInvoice(paymentsApi);
  const successState = useOverlayState();
  const [starsError, setStarsError] = useState<string | null>(null);

  const isTma = platformType !== 'web';
  const starsEnabled = isTma && extraDevicePriceStars > 0;

  const handleStarsPayment = async () => {
    if (!rmnUser?.id) return;
    setStarsError(null);

    const result = await createStarsInvoice({
      userId: rmnUser.id,
      telegramId: rmnUser.telegramId,
      selectedPeriod: 1,
      title: t('devices.extraDevicePurchase.starsInvoiceTitle'),
      description: t('devices.extraDevicePurchase.starsInvoiceDescription'),
      purpose: 'extra_device',
    });

    if (!result?.invoiceLink) {
      setStarsError(t('devices.extraDevicePurchase.starsErrorFetch'));
      return;
    }

    try {
      phCapture('extra_device_checkout_started', { payment_provider: 'stars' });
      const status = await invoice.openUrl(result.invoiceLink);
      if (status === 'paid') {
        phCapture('extra_device_purchased', { payment_provider: 'stars' });
        successState.open();
      }
    } catch {
      // User dismissed the invoice or SDK not available — silently ignore.
    }
  };

  return {
    starsEnabled,
    starsError,
    isStarsPaying,
    successState,
    handleStarsPayment,
  };
}
