import { type Selection } from '@heroui/react';
import { Page } from '@workspace/core';
import { StarsPaymentSuccessDrawer } from '@workspace/core/components';
import type { PaymentMethod } from '@workspace/types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import paymentAnimation from '../../../assets/lottie/paymentPageIcon.lottie?url';
import { useNavbarStore } from '../../../stores';
import { LottieIcon } from '../../../ui';
import { PaymentForm } from './components/PaymentForm';
import { PaymentMethodSelector } from './components/PaymentMethodSelector';
import { PaymentMethodsList } from './components/PaymentMethodsList';
import { usePayment } from './hooks/usePayment';

export default function PaymentPage() {
  const { t } = useTranslation();
  const {
    savedMethods,
    allowedAmounts,
    allowedPeriods,
    platformType,
    hasActiveMethod,
    needsEmailInput,
    isLoadingMethods,
    isDeleting,
    stripeAmount,
    starsEnabled,
    starsAmount,
    starsError,
    isPaying,
    isStripePaying,
    isStarsPaying,
    successState,
    handleDelete,
    handleYookassaPayment,
    handleStripePayment,
    handleStarsPayment,
  } = usePayment();

  const { setNavbarVisible } = useNavbarStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('yookassa');

  useEffect(() => {
    setNavbarVisible(!successState.isOpen);
  }, [setNavbarVisible, successState.isOpen]);

  const isPendingByMethod: Record<PaymentMethod, boolean> = {
    yookassa: isPaying,
    stripe: isStripePaying,
    stars: isStarsPaying,
  };
  const isPending = isPendingByMethod[selectedMethod];

  const handleSelectionChange = (keys: Selection) => {
    if (keys === 'all') return;
    const key = Array.from(keys)[0] as PaymentMethod | undefined;
    if (key) setSelectedMethod(key);
  };

  return (
    <Page
      icon={<LottieIcon src={paymentAnimation} />}
      title={t('payment.pageTitle')}
      subtitle={t('payment.pageSubtitle')}
    >
      {hasActiveMethod ? (
        <PaymentMethodsList
          savedMethods={savedMethods}
          isLoadingMethods={isLoadingMethods}
          isDeleting={isDeleting}
          onDelete={handleDelete}
        />
      ) : (
        <PaymentForm
          selectedMethod={selectedMethod}
          needsEmailInput={needsEmailInput}
          allowedAmounts={allowedAmounts}
          stripeAmount={stripeAmount}
          starsAmount={starsAmount}
          isPending={isPending}
          starsError={starsError}
          platformType={platformType}
          onYookassaPayment={handleYookassaPayment}
          onStripePayment={handleStripePayment}
          onStarsPayment={handleStarsPayment}
        >
          <PaymentMethodSelector
            selectedMethod={selectedMethod}
            starsEnabled={starsEnabled}
            onSelectionChange={handleSelectionChange}
          />
        </PaymentForm>
      )}

      <StarsPaymentSuccessDrawer
        allowedPeriods={allowedPeriods}
        isOpen={successState.isOpen}
        onClose={successState.close}
      />
    </Page>
  );
}
