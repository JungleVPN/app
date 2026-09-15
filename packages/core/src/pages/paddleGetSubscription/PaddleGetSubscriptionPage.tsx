import type { Paddle } from '@paddle/paddle-js';
import { initializePaddle } from '@paddle/paddle-js';
import { type SyntheticEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Loading } from '../../components';
import { useNavigation, usePlans, useTheme } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { useAuthStore, usePlanByMonths, usePlansStatus } from '../../stores';
import { getReferralUserId, isGlobalOrigin, scrollToTop, validateEmail } from '../../utils';
import { ActiveSubscriptionDialog } from '../getSubscription/ActiveSubscriptionDialog';
import { monthsFromSlug } from '../getSubscription/planSlug';
import { isActiveSubscriptionError, isThrottledError } from './checkoutErrors';
import { getPaddleClientToken, getPaddleEnvironment } from './paddleEnv';
import { CHECKOUT_FRAME_CLASS, PaddleGetSubscriptionComponent } from './PaddleGetSubscriptionComponent';

const EMPTY_EMAIL_ERROR = 'getSubscription.email_required_error';
const INVALID_EMAIL_ERROR = 'getSubscription.email_invalid_error';
const CHECKOUT_ERROR = 'getSubscription.checkout_error';
const THROTTLED_ERROR = 'getSubscription.throttled_error';
const CHECKOUT_FRAME_HEIGHT = 450;

interface PendingCheckout {
  priceId: string;
  customData: Record<string, string>;
  email: string;
}

/**
 * Sandbox proof-of-concept for a Paddle-powered pricing page, mirroring
 * GetSubscriptionPage's Stripe flow and UI exactly. Unlike Stripe, Paddle
 * Checkout renders directly in this page (inline mode) rather than
 * redirecting to a hosted session — this page talks to the backend only to
 * validate the request (period, duplicate subscription, rate limit) before
 * mounting it.
 *
 * The checkout form itself renders inside a Paddle-controlled frame —
 * matching its fonts/colors/borders to the HeroUI theme is a dashboard step
 * (Paddle > Checkout > Branded inline checkout), not something this code can
 * reach into.
 */
export default function PaddleGetSubscriptionPage() {
  const { planSlug } = useParams();
  const { t } = useTranslation();
  const { authUser } = useAuthStore();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // The email whose account already subscribes — also the dialog's open state.
  const [activeSubscriptionEmail, setActiveSubscriptionEmail] = useState<string | null>(null);
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [formattedTotal, setFormattedTotal] = useState<string | null>(null);
  // Detected once from the price preview (no address was sent, so Paddle
  // resolved it from the visitor's IP) and reused to open checkout — passing
  // it alongside the email skips the "your details" page straight to payment.
  const [detectedCountryCode, setDetectedCountryCode] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const openedCheckoutFor = useRef<PendingCheckout | null>(null);
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { profileSubscriptionPath, paymentReturnPath } = useAppRoutes();

  const isRu = !isGlobalOrigin();

  useEffect(() => {
    if (isRu) navigate(profileSubscriptionPath, { replace: true });
  }, [isRu, navigate, profileSubscriptionPath]);

  // Starts the one-time fetch if the visitor deep-linked here without passing
  // through the landing page; otherwise the store already holds the plans.
  usePlans();

  const selectedPeriod = monthsFromSlug(planSlug);
  const status = usePlansStatus();
  const plan = usePlanByMonths(selectedPeriod);
  const paddlePriceId = plan?.paddlePriceId ?? null;

  useEffect(() => {
    scrollToTop();
  }, []);

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

  useEffect(() => {
    if (!paddle || !paddlePriceId) return;
    let cancelled = false;

    paddle
      .PricePreview({ items: [{ priceId: paddlePriceId, quantity: 1 }] })
      .then((result) => {
        if (cancelled) return;
        const lineItem = result.data.details.lineItems[0];
        // Paddle's string is already formatted for the visitor's currency and
        // locale — shown verbatim, never re-formatted or recomputed here.
        setFormattedTotal(lineItem?.formattedTotals.total ?? null);
        setDetectedCountryCode(result.data.address?.countryCode ?? null);
      })
      .catch(() => {
        if (!cancelled) setFormattedTotal(null);
      });

    return () => {
      cancelled = true;
    };
  }, [paddle, paddlePriceId]);

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
        // Skips the "your details" page straight to payment — Paddle only
        // does this when both email and country are prefilled.
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

  const requestCheckout = async (payerEmail: string) => {
    if (selectedPeriod === null || !paddle) return;

    setIsPending(true);
    setCheckoutError(null);
    setActiveSubscriptionEmail(null);
    try {
      const { priceId, customData } = await paymentsApi.createPublicPaddleCheckout({
        email: payerEmail,
        selectedPeriod,
        toltReferralId: window.tolt_referral ?? null,
        inviterId: getReferralUserId() ?? undefined,
      });

      setPendingCheckout({ priceId, customData, email: payerEmail });
    } catch (error) {
      if (isActiveSubscriptionError(error)) {
        setActiveSubscriptionEmail(payerEmail);
        return;
      }
      setCheckoutError(t(isThrottledError(error) ? THROTTLED_ERROR : CHECKOUT_ERROR));
    } finally {
      setIsPending(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError('');
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();

    const userEmail = authUser?.email ?? email;

    if (!userEmail.trim()) {
      setEmailError(t(EMPTY_EMAIL_ERROR));
      return;
    }
    if (!validateEmail(userEmail)) {
      setEmailError(t(INVALID_EMAIL_ERROR));
      return;
    }

    await requestCheckout(userEmail);
  };

  if (isRu || status === 'idle' || status === 'loading') return <Loading />;

  return (
    <>
      <PaddleGetSubscriptionComponent
        isAuthenticated={Boolean(authUser)}
        email={email}
        emailError={emailError}
        checkoutError={checkoutError}
        isPending={isPending}
        selectedPeriod={selectedPeriod}
        formattedTotal={formattedTotal}
        hasPrice={Boolean(paddle) && paddlePriceId !== null}
        showCheckoutFrame={pendingCheckout !== null}
        handleSubmit={handleSubmit}
        handleEmailChange={handleEmailChange}
      />
      <ActiveSubscriptionDialog
        email={activeSubscriptionEmail}
        isLoggedIn={Boolean(authUser)}
        onClose={() => {
          setEmail('');
          setActiveSubscriptionEmail(null);
        }}
      />
    </>
  );
}
