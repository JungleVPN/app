import { loadWhop, type WhopLoad } from '@whop/elements';
import { WhopElements } from '@whop/elements-react';
import type { PlanPricing, WhopPromoCodeDto } from '@workspace/types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadError, Loading } from '../../components';
import { i18n } from '../../core/i18n';
import { loadPlans } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { formatIntlPrice, getReferralUserId, trackCheckoutStarted } from '../../utils';
import { ActiveSubscriptionDialog } from '../getSubscription/ActiveSubscriptionDialog';
import { CheckoutForm } from '../getSubscription/CheckoutForm';
import { type CheckoutRequest, useCheckout } from '../getSubscription/useCheckout';
import { failureFor, useWhopPay } from '../whopCheckout/useWhopPay';
import { WhopPaymentProcessingDrawer } from '../whopCheckout/WhopPaymentProcessingDrawer';
import type { WhopCheckoutCharge, WhopCheckoutState } from '../whopCheckout/whopCheckoutState';
import { getWhopEnvironment, toWhopLocale } from '../whopCheckout/whopEnv';
import { showWalletSheet, useWhopWalletSheet } from '../whopCheckout/whopWallets';
import { type PromoPrice, promoPrice } from './promoPrice';
import { WhopCardPanel } from './WhopCardPanel';
import { type PaymentMethod, WhopPaymentTabs } from './WhopPaymentTabs';
import { WhopPromoCode } from './WhopPromoCode';
import { WhopWalletSubmit } from './WhopWalletSubmit';

/** A promo's fixed amount as a price string: whole amounts as they are, others to the cent. */
const amountString = (amount: number): string =>
  Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

/**
 * The total the order summary shows — the promo total when a code reprices
 * it — or undefined when a fixed amount in another currency leaves it unknown.
 */
function shownCharge(
  pricing: PlanPricing,
  price: PromoPrice | null,
): WhopCheckoutCharge | undefined {
  if (!price) return { amount: pricing.total, currency: pricing.currencyCode };
  return 'total' in price ? { amount: price.total, currency: pricing.currencyCode } : undefined;
}

/** The checkout the backend accepted: what a payment needs, before any promo or total. */
type PreparedCheckout = Pick<
  WhopCheckoutState,
  'accountId' | 'whopPlanId' | 'renews' | 'request' | 'selectedPeriod'
>;

/** Stands in until the backend accepts a checkout; nothing can pay while it does. */
const NOT_PREPARED: PreparedCheckout = {
  accountId: '',
  whopPlanId: '',
  request: { email: '', planId: '' },
  selectedPeriod: 0,
};

/**
 * Global checkout through Whop. The email step asks the backend to accept the
 * checkout (email, plan, no active subscription) before the payer reaches the
 * payment step, so a wallet's sheet can be opened straight from the submit
 * button — within the tap, as the browser requires, and the card tab shows
 * Whop's card inputs that the same button pays. A promo code is checked and settled here, and rides along with the payment.
 */
function WhopStartCheckout() {
  const { t } = useTranslation();
  const paymentsApi = usePaymentsApi();
  const { paymentReturnPath } = useAppRoutes();
  const [promo, setPromo] = useState<WhopPromoCodeDto | null>(null);
  const [prepared, setPrepared] = useState<PreparedCheckout | null>(null);
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod | null>('apple_pay');
  const [isCardPayable, setIsCardPayable] = useState(false);
  const isAutoPrepared = useRef(false);
  const submitCard = useRef<() => void>(() => {});

  const startCheckout = async ({ email, planId, selectedPeriod }: CheckoutRequest) => {
    const request = {
      email,
      planId,
      toltReferralId: window.tolt_referral ?? null,
      inviterId: getReferralUserId() ?? undefined,
    };
    const {
      accountId,
      planId: whopPlanId,
      renews,
    } = await paymentsApi.createPublicWhopCheckout(request);

    trackCheckoutStarted({ paymentProvider: 'whop', days: selectedPeriod });

    setPrepared({ accountId, whopPlanId, renews, request, selectedPeriod });
  };

  const checkout = useCheckout(startCheckout);
  const price = promo && checkout.plan ? promoPrice(checkout.plan.planPricing, promo) : null;
  const charge = checkout.plan && shownCharge(checkout.plan.planPricing, price);
  const whopCheckout: WhopCheckoutState = {
    ...(prepared ?? NOT_PREPARED),
    ...(promo ? { promo } : {}),
    ...(charge ? { charge } : {}),
  };
  const returnUrl = `${window.location.origin}${paymentReturnPath}`;
  const payment = useWhopPay({ checkout: whopCheckout, returnUrl });
  const { sheet, wallets, isReady } = useWhopWalletSheet({
    checkout: whopCheckout,
    enabled: prepared !== null,
  });
  const method: PaymentMethod =
    chosenMethod && (chosenMethod === 'card' || wallets.includes(chosenMethod))
      ? chosenMethod
      : (wallets[0] ?? 'card');

  // A signed-in payer has no email step, so the checkout is accepted on arrival.
  const { isAuthenticated, plan, handleSubmit } = checkout;
  useEffect(() => {
    if (!isAuthenticated || !plan || isAutoPrepared.current) return;
    isAutoPrepared.current = true;
    void handleSubmit();
  }, [isAuthenticated, plan, handleSubmit]);

  if (checkout.isLoading) return <Loading />;
  if (checkout.loadFailed) return <LoadError reason='failed_to_load_plans' onRetry={loadPlans} />;

  const promoDiscount =
    price &&
    ('total' in price
      ? {
          total: price.total,
          label: t('getSubscription.promo_discount', { percent: price.percentOff }),
        }
      : {
          label: t('getSubscription.promo_discount_amount', {
            amount: formatIntlPrice(amountString(price.amountOff), price.currency),
          }),
        });

  const submitPayment = () => {
    if (!prepared) return;
    if (method === 'card') {
      submitCard.current();
      return;
    }
    if (!sheet) return;
    void payment.pay({
      via: 'wallet',
      tokenise: () => showWalletSheet(sheet, method, prepared.request.email),
    });
  };

  const arePaymentMethodsLoaded = prepared !== null && isReady;
  const canPay = prepared !== null && (method === 'card' ? isCardPayable : sheet !== null);
  const isPaying = checkout.isPending || payment.pendingVia !== null;

  return (
    <>
      <CheckoutForm
        isAuthenticated={checkout.isAuthenticated}
        email={checkout.email}
        emailError={checkout.emailError}
        checkoutError={
          checkout.checkoutError ?? failureFor(payment, method === 'card' ? 'card' : 'wallet')
        }
        isPending={isPaying}
        selectedPeriod={checkout.selectedPeriod}
        plan={checkout.plan}
        canSubmit={checkout.plan !== undefined && canPay}
        promoCodeSlot={
          checkout.plan && (
            <WhopPromoCode planId={checkout.plan.planId} applied={promo} onApplyChange={setPromo} />
          )
        }
        isPaymentLoading={!arePaymentMethodsLoaded}
        submitSlot={
          method === 'card' ? undefined : (
            <WhopWalletSubmit
              wallet={method}
              isDisabled={!(checkout.plan !== undefined && canPay) || isPaying}
              onClick={submitPayment}
            />
          )
        }
        paymentMethodsSlot={
          arePaymentMethodsLoaded && (
            <WhopPaymentTabs
              wallets={wallets}
              selected={method}
              onSelect={setChosenMethod}
              cardPanel={
                <WhopCardPanel
                  checkout={whopCheckout}
                  payment={payment}
                  returnUrl={returnUrl}
                  submitRef={submitCard}
                  onCanPayChange={setIsCardPayable}
                />
              }
            />
          )
        }
        promoDiscount={promoDiscount ?? undefined}
        taxNote={t('getSubscription.tax_included_note')}
        completeEmailStep={checkout.handleSubmit}
        handleSubmit={submitPayment}
        handleEmailChange={checkout.handleEmailChange}
      />
      <WhopPaymentProcessingDrawer isOpen={payment.pendingVia === 'wallet' && payment.isCharging} />
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
