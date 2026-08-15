import { Button, Spinner } from '@heroui/react';
import { Page } from '@workspace/core';
import { StarsPaymentSuccessDrawer } from '@workspace/core/components';
import type { PaymentMethod } from '@workspace/types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import paymentAnimation from '../../../assets/lottie/paymentPageIcon.lottie?url';
import { useNavigation } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { useNavbarStore, usePlatformStore } from '../../../stores';
import { LottieIcon } from '../../../ui';
import { isRuDomain } from '../../../utils';
import { PaymentForm } from './components/PaymentForm';
import { SavedMethod } from './components/SavedMethod';
import { usePayment } from './hooks/usePayment';
import { getButtonLabel } from './utils/getButtonLabel';

export default function PaymentPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const selectedPlan = location.state?.selectedPlan as {
    months: number;
    priceEur: number;
    priceRub: number;
  };

  const {
    savedMethods,
    hasActiveMethod,
    hasStripeSubscription,
    needsEmailInput,
    isLoadingMethods,
    isLoading,
    isDeleting,
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
  } = usePayment(selectedPlan?.months ?? 1);
  const { platformType } = usePlatformStore();
  const { setNavbarVisible } = useNavbarStore();
  const navigate = useNavigation();
  const { profilePlansPath } = useAppRoutes();
  const isRu = isRuDomain();

  const [selectedMethod] = useState<PaymentMethod>(
    isRu || platformType === 'telegram' ? 'yookassa' : 'stripe',
  );

  useEffect(() => {
    setNavbarVisible(!successState.isOpen);
  }, [setNavbarVisible, successState.isOpen]);

  useEffect(() => {
    if (!isLoading && !hasActiveMethod && !selectedPlan) {
      navigate(profilePlansPath);
    }
  }, [isLoading, hasActiveMethod, selectedPlan, navigate, profilePlansPath]);

  const buttonLabel = selectedPlan ? getButtonLabel(selectedMethod, selectedPlan, t) : '';

  const isPendingByMethod: Record<PaymentMethod, boolean> = {
    yookassa: isPaying,
    stripe: isStripePaying,
    stars: isStarsPaying,
  };
  const isPending = isPendingByMethod[selectedMethod];

  // const handleSelectionChange = (keys: Selection) => {
  //   if (keys === 'all') return;
  //   const key = Array.from(keys)[0] as PaymentMethod | undefined;
  //   if (key) setSelectedMethod(key);
  // };

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
          <SavedMethod
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
          {/*<PaymentMethodSelector*/}
          {/*  selectedMethod={selectedMethod}*/}
          {/*  starsEnabled={starsEnabled}*/}
          {/*  onSelectionChange={handleSelectionChange}*/}
          {/*  isRuDomain={isRu}*/}
          {/*/>*/}
        </PaymentForm>
      )}

      <StarsPaymentSuccessDrawer isOpen={successState.isOpen} onClose={successState.close} />
    </Page>
  );
}
