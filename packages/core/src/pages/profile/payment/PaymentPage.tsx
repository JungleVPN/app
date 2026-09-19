import { Button, Spinner } from '@heroui/react';
import { Page } from '@workspace/core';
import { StarsPaymentSuccessDrawer } from '@workspace/core/components';
import type { PaymentMethod } from '@workspace/types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import paymentAnimation from '../../../assets/lottie/paymentPageIcon.lottie?url';
import { FeaturesCard, Loading } from '../../../components';
import { useBackButton, useNavigation } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { useNavbarStore, usePlatformStore } from '../../../stores';
import { LottieIcon } from '../../../ui';
import { GLOBAL_PAYMENT_PROVIDER, phCapture, userScope } from '../../../utils';
import { PaymentForm } from './components/PaymentForm';
import { SavedMethod } from './components/SavedMethod';
import { usePayment } from './hooks/usePayment';
import { useSavedPayment } from './hooks/useSavedPayment';
import { getButtonLabel, type SelectedPlan } from './utils/getButtonLabel';

export default function PaymentPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const selectedPlan = location.state?.selectedPlan as SelectedPlan | undefined;

  const {
    needsEmailInput,
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
    handleOpenPaddlePortal,
    isOpeningPaddlePortal,
    handlePaddlePayment,
    isPaddlePaying,
    paddleError,
    validatePromo,
  } = usePayment(selectedPlan?.period ?? 1);

  useEffect(() => {
    phCapture('payments_viewed');
  }, []);

  const { savedMethods, isLoading, hasActiveMethod, hasStripeSubscription, hasPaddleSubscription } =
    useSavedPayment();

  const { platformType } = usePlatformStore();
  const { setNavbarVisible } = useNavbarStore();
  const navigate = useNavigation();
  const { profilePlansPath } = useAppRoutes();
  const isRu = userScope() === 'ru';

  // RU visitors and Telegram users pay through YooKassa; everyone else checks
  // out through whichever global provider is currently enabled.
  const globalMethod: PaymentMethod = GLOBAL_PAYMENT_PROVIDER === 'paddle' ? 'paddle' : 'stripe';
  const [selectedMethod] = useState<PaymentMethod>(
    isRu || platformType === 'telegram' ? 'yookassa' : globalMethod,
  );

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(!successState.isOpen);
  }, [setNavbarVisible, successState.isOpen]);

  useEffect(() => {
    if (!isLoading && !hasActiveMethod && !selectedPlan) {
      navigate(profilePlansPath);
    }
  }, [isLoading, hasActiveMethod, selectedPlan, navigate, profilePlansPath]);

  const buttonLabel = selectedPlan ? getButtonLabel(selectedPlan, t) : '';

  const isPendingByMethod: Record<PaymentMethod, boolean> = {
    yookassa: isPaying,
    stripe: isStripePaying,
    stars: isStarsPaying,
    paddle: isPaddlePaying,
  };
  const isPending = isPendingByMethod[selectedMethod];

  // const handleSelectionChange = (keys: Selection) => {
  //   if (keys === 'all') return;
  //   const key = Array.from(keys)[0] as PaymentMethod | undefined;
  //   if (key) setSelectedMethod(key);
  // };

  return (
    <Page
      showBackButton={!hasActiveMethod && !isLoading}
      icon={<LottieIcon src={paymentAnimation} />}
      title={t('payment.pageTitle')}
      subtitle={t('payment.pageSubtitle')}
    >
      {isLoading ? (
        <Loading />
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
          ) : hasPaddleSubscription ? (
            <Button
              fullWidth
              size='lg'
              isDisabled={isOpeningPaddlePortal}
              isPending={isOpeningPaddlePortal}
              onPress={handleOpenPaddlePortal}
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
            hasManagedSubscription={hasStripeSubscription || hasPaddleSubscription}
            savedMethods={savedMethods}
            isLoadingMethods={isLoading}
            isDeleting={isDeleting}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <>
          <PaymentForm
            selectedMethod={selectedMethod}
            needsEmailInput={needsEmailInput}
            buttonLabel={buttonLabel}
            isPending={isPending}
            starsError={starsError}
            paymentError={paddleError}
            platformType={platformType}
            enablePromo={selectedMethod !== 'stripe' && selectedMethod !== 'paddle'}
            onYookassaPayment={handleYookassaPayment}
            onStripePayment={handleStripePayment}
            onPaddlePayment={handlePaddlePayment}
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
          <div className={'mt-4'}>
            <FeaturesCard title={t('common.features.title')} />
          </div>
        </>
      )}

      <StarsPaymentSuccessDrawer isOpen={successState.isOpen} onClose={successState.close} />
    </Page>
  );
}
