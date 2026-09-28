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
import { PRICING_PATH } from '../../utils';
import { WhopCardForm } from './WhopCardForm';
import { WhopWalletButtons } from './WhopWalletButtons';
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

  const returnUrl = `${window.location.origin}${paymentReturnPath}`;

  return (
    <Page
      title={t('paddleCheckout.title')}
      subtitle={t('paddleCheckout.subtitle')}
      className={'mb-16'}
    >
      {elements && (
        <WhopElements
          elements={elements}
          environment={getWhopEnvironment()}
          locale={toWhopLocale(i18n.language)}
        >
          <WhopWalletButtons checkout={checkout} returnUrl={returnUrl} />
          <Payments accountId={checkout.accountId} plan={checkout.whopPlanId} returnUrl={returnUrl}>
            <WhopCardForm checkout={checkout} returnUrl={returnUrl} />
            <BrandingElement />
          </Payments>
        </WhopElements>
      )}
    </Page>
  );
}
