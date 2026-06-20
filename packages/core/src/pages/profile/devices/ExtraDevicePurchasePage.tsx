import { type Selection } from '@heroui/react';
import { StarsPaymentSuccessDrawer } from '@workspace/core/components';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import deviceAnimation from '../../../assets/lottie/devicesPageIcon.lottie?url';
import { coreEnv, getTelegramStickerUrl } from '../../../env';
import { useBackButton } from '../../../hooks';
import { useNavbarStore, usePlatformStore } from '../../../stores';
import { LottieIcon, Page, TgsSticker } from '../../../ui';
import { PaymentForm } from '../payment/components/PaymentForm';
import {
  type PaymentMethod,
  PaymentMethodSelector,
} from '../payment/components/PaymentMethodSelector';
import { useExtraDevicePayment } from './hooks/useExtraDevicePayment';
import { useExtraDeviceStarsPayment } from './hooks/useExtraDeviceStarsPayment';
import { useExtraDeviceStripePayment } from './hooks/useExtraDeviceStripePayment';

export default function ExtraDevicePurchasePage() {
  const { t } = useTranslation();
  const { platformType } = usePlatformStore();
  const { setNavbarVisible } = useNavbarStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('yookassa');

  const { isPaying, handlePay } = useExtraDevicePayment();
  const { starsEnabled, starsError, isStarsPaying, successState, handleStarsPayment } =
    useExtraDeviceStarsPayment();
  const { isStripePaying, handleStripePayment } = useExtraDeviceStripePayment();

  const isPending =
    selectedMethod === 'stars'
      ? isStarsPaying
      : selectedMethod === 'stripe'
        ? isStripePaying
        : isPaying;

  useEffect(() => {
    setNavbarVisible(false);
    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  useBackButton();

  const handleSelectionChange = (keys: Selection) => {
    if (keys === 'all') return;
    const key = Array.from(keys)[0] as PaymentMethod | undefined;
    if (key) setSelectedMethod(key);
  };

  const handleSuccessClose = () => {
    successState.close();
    setNavbarVisible(true);
  };

  const getButtonLabel = useCallback(() => {
    switch (selectedMethod) {
      case 'yookassa':
        return t('devices.extraDevicePurchase.priceRubButton', {
          amount: coreEnv.extraDevicePriceRUB,
        });
      case 'stripe':
        return t('devices.extraDevicePurchase.priceEurButton', {
          amount: coreEnv.extraDevicePriceEUR,
        });
      case 'stars':
        return t('devices.extraDevicePurchase.priceStarsButton', {
          amount: coreEnv.extraDevicePriceStars,
        });
    }
  }, [selectedMethod, t]);

  const buttonLabel = getButtonLabel();

  const handleExtend = async () => {
    await handlePay();
  };

  const extraDeviceStickerUrl = getTelegramStickerUrl(coreEnv.extraDeviceStickerFileId);

  return (
    <Page
      icon={
        extraDeviceStickerUrl ? (
          <TgsSticker className='h-28 w-28' src={extraDeviceStickerUrl} />
        ) : (
          <LottieIcon src={deviceAnimation} />
        )
      }
      title={t('devices.extraDevicePurchase.pageTitle')}
      subtitle={t('devices.extraDevicePurchase.pageSubtitle')}
    >
      <PaymentForm
        selectedMethod={selectedMethod}
        needsEmailInput={false}
        buttonLabel={buttonLabel}
        isPending={isPending}
        starsError={starsError}
        platformType={platformType}
        enablePromo={false}
        onYookassaPayment={handleExtend}
        onStripePayment={handleStripePayment}
        onStarsPayment={handleStarsPayment}
      >
        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          starsEnabled={starsEnabled}
          onSelectionChange={handleSelectionChange}
          isReccurring={false}
          description={t('devices.extraDevicePurchase.description')}
        />
      </PaymentForm>

      <StarsPaymentSuccessDrawer
        description={t('devices.extraDevicePurchase.starsSuccessDescription')}
        isOpen={successState.isOpen}
        onClose={handleSuccessClose}
      />
    </Page>
  );
}
