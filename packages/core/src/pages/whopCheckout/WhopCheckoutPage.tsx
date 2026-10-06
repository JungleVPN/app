import { loadWhop, type WhopLoad } from '@whop/elements';
import { BrandingElement, Payments, WhopElements } from '@whop/elements-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { i18n } from '../../core/i18n';
import { useBackButton, useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useNavbarStore } from '../../stores';
import { Page } from '../../ui';
import { checkoutEventProperties, PRICING_PATH, phCapture } from '../../utils';
import { useWhopPay } from './useWhopPay';
import { WhopCardForm } from './WhopCardForm';
import { WhopWalletButtons } from './WhopWalletButtons';
import { isWhopCheckoutState, type WhopCheckoutState } from './whopCheckoutState';
import { getWhopEnvironment, toWhopLocale } from './whopEnv';

/**
 * The wallets and the card form, sharing one payment in flight: while either
 * is charging, neither can start another, so the payer cannot pay twice.
 */
function WhopPaymentMethods({
  checkout,
  returnUrl,
}: {
  checkout: WhopCheckoutState;
  returnUrl: string;
}) {
  const payment = useWhopPay({ checkout, returnUrl });

  return (
    <>
      <WhopWalletButtons checkout={checkout} payment={payment} />
      <Payments accountId={checkout.accountId} plan={checkout.whopPlanId} returnUrl={returnUrl}>
        <WhopCardForm checkout={checkout} payment={payment} />
        <BrandingElement />
      </Payments>
    </>
  );
}

interface WhopCheckoutPageProps {
  fallbackPath?: string;
}

export default function WhopCheckoutPage({ fallbackPath }: WhopCheckoutPageProps) {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigation();
  const { paymentReturnPath } = useAppRoutes();
  const { setNavbarVisible } = useNavbarStore();
  // `loadWhop()` injects Whop's script into the document, so it only runs
  // once mounted in a browser — never during SSR.
  const [elements, setElements] = useState<WhopLoad | undefined>();

  const checkout = isWhopCheckoutState(state) ? state : null;

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(false);

    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  useEffect(() => {
    if (checkout) return;
    navigate(fallbackPath ?? PRICING_PATH, { replace: true });
  }, [checkout, fallbackPath, navigate]);

  useEffect(() => {
    if (!checkout) return;
    setElements(loadWhop());
    phCapture(
      'payment_form_viewed',
      checkoutEventProperties({ paymentProvider: 'whop', days: checkout.selectedPeriod }),
    );
  }, [checkout]);

  if (!checkout) return null;

  const returnUrl = `${window.location.origin}${paymentReturnPath}`;

  return (
    <Page
      title={t('paddleCheckout.title')}
      subtitle={t('paddleCheckout.subtitle')}
      className={'mb-16 max-w-xl m-auto'}
    >
      {elements && (
        <WhopElements
          elements={elements}
          environment={getWhopEnvironment()}
          locale={toWhopLocale(i18n.language)}
        >
          <WhopPaymentMethods checkout={checkout} returnUrl={returnUrl} />
        </WhopElements>
      )}
    </Page>
  );
}
