import { useOverlayState } from '@heroui/react';
import { invoice } from '@tma.js/sdk-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coreEnv } from '../../../../env';
import { useCreateTelegramStarsInvoice } from '../../../../hooks';
import { usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo, usePlatformStore } from '../../../../stores';

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
    if (!rmnUser?.uuid) return;
    setStarsError(null);

    const result = await createStarsInvoice({
      userId: rmnUser.uuid,
      telegramId: rmnUser.telegramId,
      title: t('devices.extraDevicePurchase.starsInvoiceTitle'),
      description: t('devices.extraDevicePurchase.starsInvoiceDescription'),
      purpose: 'extra_device',
    });

    if (!result?.invoiceLink) {
      setStarsError(t('devices.extraDevicePurchase.starsErrorFetch'));
      return;
    }

    try {
      const status = await invoice.openUrl(result.invoiceLink);
      if (status === 'paid') {
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
