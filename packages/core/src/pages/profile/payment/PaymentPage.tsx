import { type Selection } from '@heroui/react';
import { Page } from '@workspace/core';
import { StarsPaymentSuccessDrawer } from '@workspace/core/components';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import paymentAnimation from '../../../assets/lottie/paymentPageIcon.lottie?url';
import { useNavbarStore } from '../../../stores';
import { LottieIcon } from '../../../ui';
import { PaymentForm } from './components/PaymentForm';
import { type PaymentMethod, PaymentMethodSelector } from './components/PaymentMethodSelector';
import { PaymentMethodsList } from './components/PaymentMethodsList';
import { TermsDialog } from './components/TermsDialog';
import { usePayment } from './hooks/usePayment';

export default function PaymentPage() {
  const { t } = useTranslation();
  const {
    savedMethods,
    allowedAmounts,
    allowedPeriods,
    supportUrl,
    platformType,
    hasActiveMethod,
    needsEmailInput,
    isLoadingMethods,
    isDeleting,
    starsEnabled,
    starsAmount,
    starsError,
    isPaying,
    isStarsPaying,
    termsState,
    successState,
    handleDelete,
    handleExtend,
    handleStarsPayment,
  } = usePayment();

  const { setNavbarVisible } = useNavbarStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');

  useEffect(() => {
    if (successState.isOpen || termsState.isOpen) {
      setNavbarVisible(false);
    } else {
      setNavbarVisible(true);
    }
  }, [setNavbarVisible, successState.isOpen, termsState.isOpen]);

  const isPending = selectedMethod === 'stars' ? isStarsPaying : isPaying;

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
          onTermsOpen={termsState.open}
        />
      ) : (
        <>
          <PaymentMethodSelector
            selectedMethod={selectedMethod}
            starsEnabled={starsEnabled}
            onSelectionChange={handleSelectionChange}
          />
          <PaymentForm
            selectedMethod={selectedMethod}
            needsEmailInput={needsEmailInput}
            allowedAmounts={allowedAmounts}
            starsAmount={starsAmount}
            isPending={isPending}
            starsError={starsError}
            onExtend={handleExtend}
            onStarsPayment={handleStarsPayment}
            onTermsOpen={termsState.open}
          />
        </>
      )}

      <StarsPaymentSuccessDrawer
        allowedPeriods={allowedPeriods}
        isOpen={successState.isOpen}
        onClose={successState.close}
      />

      <TermsDialog
        isOpen={termsState.isOpen}
        platformType={platformType}
        supportUrl={supportUrl}
        onOpenChange={termsState.setOpen}
        onTermsLinkClick={() => termsState.setOpen(false)}
      />
    </Page>
  );
}
