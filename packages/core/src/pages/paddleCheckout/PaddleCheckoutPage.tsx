import type { Paddle } from '@paddle/paddle-js';
import { initializePaddle } from '@paddle/paddle-js';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { i18n } from '../../core/i18n';
import { useBackButton, useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useNavbarStore } from '../../stores';
import { Container, Page } from '../../ui';
import { isPaddleCheckoutState } from './paddleCheckoutState';
import { getPaddleClientToken, getPaddleEnvironment } from './paddleEnv';

const CHECKOUT_FRAME_CLASS = 'paddle-checkout-frame';
const CHECKOUT_FRAME_HEIGHT = 450;

interface PaddleCheckoutPageProps {
  fallbackPath?: string;
}

export default function PaddleCheckoutPage({ fallbackPath }: PaddleCheckoutPageProps) {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigation();
  const { paymentReturnPath, publicPlansPath } = useAppRoutes();
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const hasOpenedCheckout = useRef(false);
  const { setNavbarVisible } = useNavbarStore();

  const { language } = i18n;
  const checkout = isPaddleCheckoutState(state) ? state : null;

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(false);

    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  useEffect(() => {
    if (checkout) return;
    navigate(fallbackPath ?? publicPlansPath, { replace: true });
  }, [checkout, fallbackPath, navigate, publicPlansPath]);

  useEffect(() => {
    if (!checkout) return;
    let cancelled = false;
    initializePaddle({
      token: getPaddleClientToken(),
      environment: getPaddleEnvironment(),
    }).then((instance) => {
      if (!cancelled) setPaddle(instance);
    });
    return () => {
      cancelled = true;
    };
  }, [checkout]);

  useEffect(() => {
    if (!paddle || !checkout || hasOpenedCheckout.current) return;
    hasOpenedCheckout.current = true;

    paddle.Checkout.open({
      items: [{ priceId: checkout.priceId, quantity: 1 }],
      customData: checkout.customData,
      customer: {
        email: checkout.email,
        ...(checkout.countryCode && { address: { countryCode: checkout.countryCode } }),
      },
      settings: {
        locale: language,
        successUrl: `${window.location.origin}${paymentReturnPath}`,
        allowLogout: false,
        theme: 'light',
        variant: 'one-page',
        displayMode: 'inline',
        frameTarget: CHECKOUT_FRAME_CLASS,
        frameInitialHeight: CHECKOUT_FRAME_HEIGHT,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
      },
    });
  }, [paddle, checkout, paymentReturnPath]);

  if (!checkout) return null;

  return (
    <Container maxWidth={'md'}>
      <Page title={t('paddleCheckout.title')} subtitle={t('paddleCheckout.subtitle')}>
        <div className={CHECKOUT_FRAME_CLASS} />
      </Page>
    </Container>
  );
}
