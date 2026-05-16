import { Page } from '@workspace/core';
import { ExtendCard, StarsPaymentSuccessDrawer } from '@workspace/core/components';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentPageIcon from '../../../assets/icons/payment-icon.svg?url';
import { useNavbarStore } from '../../../stores';
import { PaymentMethodsList } from './components/PaymentMethodsList';
import { StarsPaymentButton } from './components/StarsPaymentButton';
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
    starsEnabled,
    starsError,
    isPaying,
    isStarsPaying,
    isDeleting,
    termsState,
    successState,
    handleDelete,
    handleExtend,
    handleStarsPayment,
  } = usePayment();

  const { setNavbarVisible } = useNavbarStore();

  useEffect(() => {
    if (successState.isOpen || termsState.isOpen) {
      setNavbarVisible(false);
    } else {
      setNavbarVisible(true);
    }
  }, [setNavbarVisible, successState.isOpen, termsState.isOpen]);

  return (
    <Page
      icon={PaymentPageIcon}
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
          <ExtendCard
            allowedAmounts={allowedAmounts}
            isPaying={isPaying}
            showEmailInput={needsEmailInput}
            onExtend={handleExtend}
            onTermsOpen={termsState.open}
          />
          {starsEnabled && (
            <StarsPaymentButton
              isDisabled={isStarsPaying}
              error={starsError}
              onPress={handleStarsPayment}
            />
          )}
        </>
      )}

      <StarsPaymentSuccessDrawer
        allowedPeriods={allowedPeriods}
        isOpen={successState.isOpen}
        onClose={successState.close}
      />

      <TermsDialog
        isOpen={termsState.isOpen}
        supportUrl={supportUrl}
        platformType={platformType}
        onOpenChange={termsState.setOpen}
        onTermsLinkClick={() => termsState.setOpen(false)}
      />
    </Page>
  );
}
