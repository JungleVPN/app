import type { Paddle } from '@paddle/paddle-js';
import { initializePaddle } from '@paddle/paddle-js';
import { useEffect, useRef, useState } from 'react';
import { Loading } from '../../components';
import { useTheme } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { getReferralUserId } from '../../utils';
import { ActiveSubscriptionDialog } from '../getSubscription/ActiveSubscriptionDialog';
import { CheckoutForm } from '../getSubscription/CheckoutForm';
import { type CheckoutRequest, useCheckout } from '../getSubscription/useCheckout';
import { getPaddleClientToken, getPaddleEnvironment } from './paddleEnv';

/**
 * `frameTarget` on Paddle.Checkout.open() takes a class name, not an id — the
 * checkout frame is looked up by class, so the `<div>` rendered below must
 * carry exactly this one.
 */
const CHECKOUT_FRAME_CLASS = 'paddle-checkout-frame';
const CHECKOUT_FRAME_HEIGHT = 450;

interface PendingCheckout {
  priceId: string;
  customData: Record<string, string>;
  email: string;
}

/**
 * Global checkout through Paddle. Unlike Stripe's hosted session, Paddle
 * Checkout renders inside this page (inline mode) — the backend is called
 * only to validate the request (period, duplicate subscription, rate limit)
 * and hand back the price to mount it against.
 *
 * The checkout form itself renders inside a Paddle-controlled frame —
 * matching its fonts/colors/borders to the HeroUI theme is a dashboard step
 * (Paddle > Checkout > Branded inline checkout), not something this code can
 * reach into.
 */
export default function PaddleCheckoutPage() {
  const paymentsApi = usePaymentsApi();
  const { theme } = useTheme();
  const { paymentReturnPath } = useAppRoutes();
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const openedCheckoutFor = useRef<PendingCheckout | null>(null);

  const startCheckout = async ({ email, selectedPeriod }: CheckoutRequest) => {
    const { priceId, customData } = await paymentsApi.createPublicPaddleCheckout({
      email,
      selectedPeriod,
      toltReferralId: window.tolt_referral ?? null,
      inviterId: getReferralUserId() ?? undefined,
    });

    setPendingCheckout({ priceId, customData, email });
  };

  const checkout = useCheckout(startCheckout);

  // The plans preview already detected the visitor's country from their IP
  // (see CommonService.getPlans) — passing it alongside the email skips the
  // "your details" page straight to payment.
  const detectedCountryCode = checkout.plan?.countryCode ?? null;

  // Failing loudly here (an unset/invalid env var throws) is deliberate: a
  // misconfigured token or environment must never silently open a checkout
  // against the wrong Paddle account.
  useEffect(() => {
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
  }, []);

  // Opens the inline checkout once its container `<div>` exists in the DOM —
  // this effect runs after the render triggered by `setPendingCheckout`, so
  // `.paddle-checkout-frame` is already mounted by the time Paddle looks it up.
  useEffect(() => {
    if (!paddle || !pendingCheckout) return;
    if (openedCheckoutFor.current === pendingCheckout) return;
    openedCheckoutFor.current = pendingCheckout;

    paddle.Checkout.open({
      items: [{ priceId: pendingCheckout.priceId, quantity: 1 }],
      customData: pendingCheckout.customData,
      customer: {
        email: pendingCheckout.email,
        // Paddle only skips the details page when both email and country are prefilled.
        ...(detectedCountryCode && { address: { countryCode: detectedCountryCode } }),
      },
      settings: {
        successUrl: `${window.location.origin}${paymentReturnPath}`,
        // The email was just validated and handed to Paddle above — the
        // checkout must not let the payer swap it for a different address.
        allowLogout: false,
        theme,
        displayMode: 'inline',
        frameTarget: CHECKOUT_FRAME_CLASS,
        frameInitialHeight: CHECKOUT_FRAME_HEIGHT,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
      },
    });
  }, [paddle, pendingCheckout, detectedCountryCode, paymentReturnPath, theme]);

  if (checkout.isLoading) return <Loading />;

  return (
    <>
      <CheckoutForm
        isAuthenticated={checkout.isAuthenticated}
        email={checkout.email}
        emailError={checkout.emailError}
        checkoutError={checkout.checkoutError}
        isPending={checkout.isPending}
        selectedPeriod={checkout.selectedPeriod}
        plan={checkout.plan}
        canSubmit={checkout.plan !== undefined && paddle !== undefined}
        checkoutFrame={
          // Paddle looks this class up by name (frameTarget) to mount the checkout iframe here.
          pendingCheckout ? <div className={CHECKOUT_FRAME_CLASS} /> : undefined
        }
        handleSubmit={checkout.handleSubmit}
        handleEmailChange={checkout.handleEmailChange}
      />
      <ActiveSubscriptionDialog
        email={checkout.activeSubscriptionEmail}
        isLoggedIn={checkout.isAuthenticated}
        onClose={checkout.dismissActiveSubscription}
      />
    </>
  );
}
