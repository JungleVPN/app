import { Page } from '@workspace/core';
import { StarsPaymentSuccessDrawer } from '@workspace/core/components';
import type { PaymentMethod } from '@workspace/types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import paymentAnimation from '../../../assets/lottie/paymentPageIcon.lottie?url';
import { FeaturesCard, Loading } from '../../../components';
import { useBackButton, useNavigation, usePlans } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { useNavbarStore, usePlanById, usePlansStatus, usePlatformStore } from '../../../stores';
import { LottieIcon } from '../../../ui';
import { currentScope, GLOBAL_PAYMENT_PROVIDER, phCapture } from '../../../utils';
import WhopStartCheckoutPage from '../../checkout/whopGetSubscription/WhopStartCheckoutPage';
import { PaymentForm } from './components/PaymentForm';
import { WhopSubscriptionCard } from './components/WhopSubscriptionCard';
import { YookassaSubscriptionCard } from './components/YookassaSubscriptionCard';
import { usePayment } from './hooks/usePayment';
import { useSavedPayment } from './hooks/useSavedPayment';
import { getButtonLabel, type SelectedPlan } from './utils/getButtonLabel';

export default function PaymentPage() {
  const { t } = useTranslation();
  const { planId } = useParams();
  // The plan lives in the URL so a reload keeps it; the store is filled on
  // demand when the page is opened directly.
  usePlans();
  const plansStatus = usePlansStatus();
  const plan = usePlanById(planId);
  const selectedPlan: SelectedPlan | undefined = plan
    ? { days: plan.days, pricing: plan.planPricing }
    : undefined;
  const arePlansSettled = plansStatus === 'loaded' || plansStatus === 'error';

  const {
    needsEmailInput,
    starsError,
    isPaying,
    isStripePaying,
    isStarsPaying,
    successState,
    handleYookassaPayment,
    handleStripePayment,
    handleStarsPayment,
    validatePromo,
  } = usePayment(plan);

  useEffect(() => {
    phCapture('payments_viewed');
  }, []);

  const {
    whopMethod,
    yookassaMethod,
    isLoading,
    hasActiveMethod,
    hasWhopSubscription,
    hasYookassaSubscription,
  } = useSavedPayment();

  const { platformType } = usePlatformStore();
  const { setNavbarVisible } = useNavbarStore();
  const navigate = useNavigation();
  const { profilePlansPath } = useAppRoutes();
  const isRu = currentScope() === 'ru';

  const [selectedMethod] = useState<PaymentMethod>(
    isRu || platformType === 'telegram' ? 'yookassa' : GLOBAL_PAYMENT_PROVIDER,
  );

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(!successState.isOpen);
  }, [setNavbarVisible, successState.isOpen]);

  useEffect(() => {
    if (!isLoading && arePlansSettled && !hasActiveMethod && !selectedPlan) {
      navigate(profilePlansPath);
    }
  }, [isLoading, arePlansSettled, hasActiveMethod, selectedPlan, navigate, profilePlansPath]);

  const buttonLabel = selectedPlan ? getButtonLabel(selectedPlan, t) : '';

  const isPendingByMethod: Partial<Record<PaymentMethod, boolean>> = {
    yookassa: isPaying,
    stripe: isStripePaying,
    stars: isStarsPaying,
  };
  const isPending = isPendingByMethod[selectedMethod] ?? false;
  const showPageAssets =
    hasWhopSubscription || hasYookassaSubscription || selectedMethod === 'yookassa';

  return (
    <Page
      showBackButton={!hasActiveMethod && !isLoading}
      icon={showPageAssets ? <LottieIcon src={paymentAnimation} /> : undefined}
      title={showPageAssets ? t('payment.pageTitle') : null}
      subtitle={showPageAssets ? t('payment.pageSubtitle') : undefined}
    >
      {isLoading || (planId !== undefined && !arePlansSettled) ? (
        <Loading />
      ) : hasActiveMethod ? (
        <div className='flex flex-col gap-2'>
          {hasWhopSubscription ? (
            <WhopSubscriptionCard method={whopMethod} />
          ) : (
            <YookassaSubscriptionCard method={yookassaMethod} />
          )}
        </div>
      ) : selectedMethod === 'whop' ? (
        <WhopStartCheckoutPage />
      ) : (
        <>
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
          />
          <div className={'mt-4'}>
            <FeaturesCard title={t('common.features.title')} />
          </div>
        </>
      )}

      <StarsPaymentSuccessDrawer isOpen={successState.isOpen} onClose={successState.close} />
    </Page>
  );
}
