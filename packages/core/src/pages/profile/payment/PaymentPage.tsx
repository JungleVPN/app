import { Button, type Selection, Spinner } from '@heroui/react';
import { Page } from '@workspace/core';
import { StarsPaymentSuccessDrawer } from '@workspace/core/components';
import type { PaymentMethod } from '@workspace/types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import paymentAnimation from '../../../assets/lottie/paymentPageIcon.lottie?url';
import { coreEnv } from '../../../env';
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
    platformType,
    hasActiveMethod,
    hasStripeSubscription,
    needsEmailInput,
    isLoadingMethods,
    isLoading,
    isDeleting,
    starsEnabled,
    starsError,
    isPaying,
    isStripePaying,
    isStarsPaying,
    successState,
    handleDelete,
    handleYookassaPayment,
    handleStripePayment,
    handleStarsPayment,
    handleOpenStripePortal,
    isOpeningStripePortal,
    validatePromo,
  } = usePayment();
  const { setNavbarVisible } = useNavbarStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('yookassa');

  useEffect(() => {
    setNavbarVisible(!successState.isOpen);
  }, [setNavbarVisible, successState.isOpen]);

  const getButtonLabel = useCallback(() => {
    switch (selectedMethod) {
      case 'yookassa':
        return t('payment.priceRubButton', { amount: coreEnv.allowedAmountRub });
      case 'stripe':
        return t('payment.priceEurButton', { amount: coreEnv.allowedAmountStripe });
      case 'stars':
        return t('payment.priceStarsButton', { amount: coreEnv.allowedAmountStars });
    }
  }, [selectedMethod, t]);

  const buttonLabel = getButtonLabel();

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
      {isLoading ? (
        <div className='flex justify-center p-8'>
          <Spinner color='accent' size='lg' />
        </div>
      ) : hasActiveMethod ? (
        <div className='flex flex-col gap-3'>
          {hasStripeSubscription ? (
            <Button
              fullWidth
              size='lg'
              isDisabled={isOpeningStripePortal}
              isPending={isOpeningStripePortal}
              onPress={handleOpenStripePortal}
            >
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color='current' size='sm' /> : null}
                  {t('payment.stripeManageButton')}
                </>
              )}
            </Button>
          ) : null}
          <PaymentMethodsList
            savedMethods={savedMethods}
            isLoadingMethods={isLoadingMethods}
            isDeleting={isDeleting}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <PaymentForm
          selectedMethod={selectedMethod}
          needsEmailInput={needsEmailInput}
          buttonLabel={buttonLabel}
          isPending={isPending}
          starsError={starsError}
          platformType={platformType}
          enablePromo={selectedMethod !== 'stripe'}
          onYookassaPayment={handleYookassaPayment}
          onStripePayment={handleStripePayment}
          onStarsPayment={handleStarsPayment}
          onValidatePromo={validatePromo}
        >
          <PaymentMethodSelector
            selectedMethod={selectedMethod}
            starsEnabled={starsEnabled}
            onSelectionChange={handleSelectionChange}
          />
        </PaymentForm>
      )}

      <StarsPaymentSuccessDrawer isOpen={successState.isOpen} onClose={successState.close} />
    </Page>
  );
}
