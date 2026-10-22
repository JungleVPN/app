import { loadWhop, type WhopLoad } from '@whop/elements';
import { WhopElements } from '@whop/elements-react';
import type { WhopPromoCodeDto } from '@workspace/types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadError, Loading } from '../../../components';
import { i18n } from '../../../i18n';
import { loadPlans } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { ActiveSubscriptionDialog } from '../getSubscription/components/ActiveSubscriptionDialog';
import { CheckoutForm } from '../getSubscription/components/CheckoutForm';
import { WhopPaymentProcessingDrawer } from '../whopCheckout/components/WhopPaymentProcessingDrawer';
import { failureFor, useWhopPay } from '../whopCheckout/hooks/useWhopPay';
import { getWhopEnvironment, toWhopLocale } from '../whopCheckout/utils/whopEnv';
import type { WhopCheckoutState } from '../whopCheckout/whopCheckoutState';
import { WhopCardPanel } from './components/WhopCardPanel';
import { WhopPaymentTabs } from './components/WhopPaymentTabs';
import { WhopPromoCode } from './components/WhopPromoCode';
import { WhopWalletSubmit } from './components/WhopWalletSubmit';
import { NOT_PREPARED, usePreparedCheckout } from './hooks/usePreparedCheckout';
import { useWhopPaymentMethod } from './hooks/useWhopPaymentMethod';
import { promoDiscount, shownCharge } from './utils/orderPricing';
import { promoPrice } from './utils/promoPrice';

/**
 * Global checkout through Whop. The email step asks the backend to accept the
 * checkout (email, plan, no active subscription) before the payer reaches the
 * payment step, so a wallet's sheet can be opened straight from the submit
 * button — within the tap, as the browser requires, and the card tab shows
 * Whop's card inputs that the same button pays. A promo code is checked and settled here, and rides along with the payment.
 */
function WhopStartCheckout() {
  const { t } = useTranslation();
  const { paymentReturnPath } = useAppRoutes();
  const [promo, setPromo] = useState<WhopPromoCodeDto | null>(null);
  const { checkout, prepared, retryPrepare } = usePreparedCheckout();

  const pricing = checkout.plan?.planPricing;
  const price = promo && pricing ? promoPrice(pricing, promo) : null;
  const charge = pricing && shownCharge(pricing, price);
  const whopCheckout: WhopCheckoutState = {
    ...(prepared ?? NOT_PREPARED),
    ...(promo ? { promo } : {}),
    ...(charge ? { charge } : {}),
  };
  const returnUrl = `${window.location.origin}${paymentReturnPath}`;
  const payment = useWhopPay({ checkout: whopCheckout, returnUrl });
  const paymentMethod = useWhopPaymentMethod({
    checkout: whopCheckout,
    prepared,
    plan: checkout.plan,
    payment,
  });

  if (checkout.isLoading) return <Loading />;
  if (checkout.loadFailed) return <LoadError reason='failed_to_load_plans' onRetry={loadPlans} />;
  if (checkout.isAuthenticated && !prepared && !checkout.isPending && checkout.checkoutError) {
    return <LoadError reason='failed_to_start_checkout' onRetry={retryPrepare} />;
  }

  const isCard = paymentMethod.method === 'card';
  const canSubmit = checkout.plan !== undefined && paymentMethod.canPay;
  const isPaying = checkout.isPending || payment.pendingVia !== null;

  const promoCodeSlot = checkout.plan && (
    <WhopPromoCode planId={checkout.plan.planId} applied={promo} onApplyChange={setPromo} />
  );

  const paymentMethodsSlot = paymentMethod.canShowMethods && (
    <WhopPaymentTabs
      wallets={paymentMethod.wallets}
      selected={paymentMethod.method}
      onSelect={paymentMethod.select}
      cardPanel={
        <WhopCardPanel
          checkout={paymentMethod.cardCheckout}
          payment={payment}
          returnUrl={returnUrl}
          submitRef={paymentMethod.submitCard}
          onCanPayChange={paymentMethod.onCardPayableChange}
        />
      }
    />
  );

  const submitSlot =
    paymentMethod.method === 'card' ? undefined : (
      <WhopWalletSubmit
        wallet={paymentMethod.method}
        isDisabled={!canSubmit || isPaying}
        onClick={paymentMethod.submit}
      />
    );

  return (
    <>
      <CheckoutForm
        isAuthenticated={checkout.isAuthenticated}
        email={checkout.email}
        emailError={checkout.emailError}
        checkoutError={checkout.checkoutError ?? failureFor(payment, isCard ? 'card' : 'wallet')}
        isPending={isPaying}
        selectedPeriod={checkout.selectedPeriod}
        plan={checkout.plan}
        canSubmit={canSubmit}
        promoCodeSlot={promoCodeSlot}
        isPaymentLoading={!paymentMethod.isLoaded}
        preloadPaymentStep={!checkout.isAuthenticated}
        hideAgreement={isCard}
        submitSlot={submitSlot}
        paymentMethodsSlot={paymentMethodsSlot}
        promoDiscount={price ? promoDiscount(price, t) : undefined}
        taxNote={t('getSubscription.tax_included_note')}
        completeEmailStep={checkout.handleSubmit}
        handleSubmit={paymentMethod.submit}
        handleEmailChange={checkout.handleEmailChange}
      />
      <WhopPaymentProcessingDrawer isOpen={payment.isCharging} />
      <ActiveSubscriptionDialog
        email={checkout.activeSubscriptionEmail}
        isLoggedIn={checkout.isAuthenticated}
        onClose={checkout.dismissActiveSubscription}
      />
    </>
  );
}

export default function WhopStartCheckoutPage() {
  // `loadWhop()` injects Whop's script into the document, so it only runs
  // once mounted in a browser — never during SSR.
  const [elements, setElements] = useState<WhopLoad | undefined>();

  useEffect(() => {
    setElements(loadWhop());
  }, []);

  if (!elements) return <Loading />;

  return (
    <WhopElements
      elements={elements}
      environment={getWhopEnvironment()}
      locale={toWhopLocale(i18n.language)}
    >
      <WhopStartCheckout />
    </WhopElements>
  );
}
