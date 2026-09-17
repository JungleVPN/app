import { useRef } from 'react';
import { Loading } from '../../components';
import { useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { getReferralUserId } from '../../utils';
import { ActiveSubscriptionDialog } from '../getSubscription/ActiveSubscriptionDialog';
import { CheckoutForm } from '../getSubscription/CheckoutForm';
import { type CheckoutRequest, useCheckout } from '../getSubscription/useCheckout';

/**
 * Global checkout through Paddle: the email step and the order summary, up to
 * the point a payment can begin. The backend is called only to validate the
 * request (period, duplicate subscription, rate limit) and hand back the price
 * to bill.
 *
 * The checkout itself is not rendered here — every Paddle payment, from this
 * page or from the profile, goes through the one dedicated checkout route, so
 * there is a single place that mounts a Paddle checkout.
 */
export default function PaddleStartCheckoutPage() {
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { paddleCheckoutPath } = useAppRoutes();
  // Read at submit time, not at render time: `useCheckout` resolves the plan
  // (and with it the detected country) only after this callback is handed to it.
  const countryCodeRef = useRef<string | null>(null);

  const startCheckout = async ({ email, selectedPeriod }: CheckoutRequest) => {
    const { priceId, customData } = await paymentsApi.createPublicPaddleCheckout({
      email,
      selectedPeriod,
      toltReferralId: window.tolt_referral ?? null,
      inviterId: getReferralUserId() ?? undefined,
    });

    // The plans preview already detected the visitor's country from their IP
    // (see CommonService.getPlans) — carrying it alongside the email is what
    // lets the checkout skip Paddle's "Your details" step.
    navigate(paddleCheckoutPath, {
      state: { priceId, customData, email, countryCode: countryCodeRef.current, selectedPeriod },
    });
  };

  const checkout = useCheckout(startCheckout);
  countryCodeRef.current = checkout.plan?.countryCode ?? null;

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
        canSubmit={checkout.plan !== undefined}
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
