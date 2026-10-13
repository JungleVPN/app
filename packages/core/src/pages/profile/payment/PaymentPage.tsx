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
import {
  useNavbarStore,
  usePlanById,
  usePlansStatus,
  usePlatformStore,
  useWhopSubscription,
} from '../../../stores';
import { LottieIcon } from '../../../ui';
import { GLOBAL_PAYMENT_PROVIDER, phCapture, userScope } from '../../../utils';
import WhopStartCheckoutPage from '../../whopGetSubscription/WhopStartCheckoutPage';
import { PaymentForm } from './components/PaymentForm';
import { SavedMethod } from './components/SavedMethod';
import { WhopSubscriptionCard } from './components/WhopSubscriptionCard';
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
    validatePromo,
  } = usePayment(plan);

  useEffect(() => {
    phCapture('payments_viewed');
  }, []);

  const { savedMethods, isLoading, hasActiveMethod, hasWhopSubscription } = useSavedPayment();

  const [whopMethod] = useWhopSubscription().methods;
  const { platformType } = usePlatformStore();
  const { setNavbarVisible } = useNavbarStore();
  const navigate = useNavigation();
  const { profilePlansPath } = useAppRoutes();
  const isRu = userScope() === 'ru';

  // RU visitors and Telegram users pay through YooKassa; everyone else checks
  // out through whichever global provider is currently enabled.
  const globalMethod: PaymentMethod = GLOBAL_PAYMENT_PROVIDER;
  const [selectedMethod] = useState<PaymentMethod>(
    isRu || platformType === 'telegram' ? 'yookassa' : globalMethod,
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

  return (
    <Page
      showBackButton={!hasActiveMethod && !isLoading}
      icon={hasActiveMethod ? <LottieIcon src={paymentAnimation} /> : undefined}
      title={hasActiveMethod ? t('payment.pageTitle') : null}
      subtitle={hasActiveMethod ? t('payment.pageSubtitle') : undefined}
    >
      {isLoading || (planId !== undefined && !arePlansSettled) ? (
        <Loading />
      ) : hasActiveMethod ? (
        <div className='flex flex-col gap-2'>
          {hasWhopSubscription ? <WhopSubscriptionCard method={whopMethod} /> : null}
          <SavedMethod
            hasManagedSubscription={hasWhopSubscription}
            savedMethods={savedMethods}
            isLoadingMethods={isLoading}
            isDeleting={isDeleting}
            onDelete={handleDelete}
          />
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
