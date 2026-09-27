import { loadWhop, type WhopLoad } from '@whop/elements';
import { Checkout, CheckoutElement, WhopElements } from '@whop/elements-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { i18n } from '../../core/i18n';
import { useBackButton, useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useNavbarStore } from '../../stores';
import { Container, Page } from '../../ui';
import { PRICING_PATH } from '../../utils';
import { isWhopCheckoutState } from './whopCheckoutState';
import { getWhopEnvironment, toWhopLocale } from './whopEnv';

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
    if (checkout) setElements(loadWhop());
  }, [checkout]);

  if (!checkout) return null;

  return (
    <Container maxWidth={'md'}>
      <Page title={t('paddleCheckout.title')} subtitle={t('paddleCheckout.subtitle')}>
        {elements && (
          <WhopElements
            elements={elements}
            environment={getWhopEnvironment()}
            locale={toWhopLocale(i18n.language)}
          >
            <Checkout
              checkoutConfiguration={checkout.checkoutConfigurationId}
              returnUrl={`${window.location.origin}${paymentReturnPath}`}
            >
              <CheckoutElement buyerEmail={checkout.email} lockBuyerEmail />
            </Checkout>
          </WhopElements>
        )}
      </Page>
    </Container>
  );
}
