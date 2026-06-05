import { type Selection } from '@heroui/react';
import { backButton, mainButton } from '@tma.js/sdk-react';
import { StarsPaymentSuccessDrawer } from '@workspace/core/components';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import deviceAnimation from '../../../assets/lottie/devicesPageIcon.lottie?url';
import { coreEnv } from '../../../env';
import { useAppRoutes } from '../../../runtime';
import { useNavbarStore, usePlatformStore } from '../../../stores';
import { LottieIcon, Page } from '../../../ui';
import { PaymentForm } from '../payment/components/PaymentForm';
import {
  type PaymentMethod,
  PaymentMethodSelector,
} from '../payment/components/PaymentMethodSelector';
import { useExtraDevicePayment } from './hooks/useExtraDevicePayment';
import { useExtraDeviceStarsPayment } from './hooks/useExtraDeviceStarsPayment';

export default function ExtraDevicePurchasePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { platformType } = usePlatformStore();
  const { setNavbarVisible } = useNavbarStore();
  const { profileDevicesPath } = useAppRoutes();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');

  const { isPaying, handlePay } = useExtraDevicePayment();
  const { starsEnabled, starsAmount, starsError, isStarsPaying, successState, handleStarsPayment } =
    useExtraDeviceStarsPayment();

  const isPending = selectedMethod === 'stars' ? isStarsPaying : isPaying;

  useEffect(() => {
    setNavbarVisible(false);
    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  useEffect(() => {
    if (platformType !== 'telegram') return;
    const handler = () => navigateRef.current(profileDevicesPath, { replace: true });
    backButton.show();
    backButton.onClick(handler);
    return () => {
      backButton.offClick(handler);
      backButton.hide();
    };
  }, [platformType, profileDevicesPath]);

  const handleSelectionChange = (keys: Selection) => {
    if (keys === 'all') return;
    const key = Array.from(keys)[0] as PaymentMethod | undefined;
    if (key) setSelectedMethod(key);
  };

  const handleSuccessClose = () => {
    successState.close();
    setNavbarVisible(true);
  };

  const buttonLabel =
    selectedMethod === 'stars'
      ? t('devices.extraDevicePurchase.starsButton', { amount: starsAmount })
      : t('devices.extraDevicePurchase.priceButton', { amount: coreEnv.extraDevicePrice });

  const handleExtend = async () => {
    mainButton.hide();
    await handlePay();
  };

  return (
    <Page
      icon={<LottieIcon src={deviceAnimation} />}
      title={t('devices.extraDevicePurchase.pageTitle')}
      subtitle={t('devices.extraDevicePurchase.pageSubtitle')}
    >
      <PaymentForm
        selectedMethod={selectedMethod}
        needsEmailInput={false}
        allowedAmounts=''
        starsAmount={starsAmount}
        buttonLabel={buttonLabel}
        isPending={isPending}
        starsError={starsError}
        platformType={platformType}
        onExtend={handleExtend}
        onStarsPayment={handleStarsPayment}
      >
        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          starsEnabled={starsEnabled}
          onSelectionChange={handleSelectionChange}
          isReccurring={false}
        />
      </PaymentForm>

      <StarsPaymentSuccessDrawer
        allowedPeriods={0}
        description={t('devices.extraDevicePurchase.starsSuccessDescription')}
        isOpen={successState.isOpen}
        onClose={handleSuccessClose}
      />
    </Page>
  );
}
