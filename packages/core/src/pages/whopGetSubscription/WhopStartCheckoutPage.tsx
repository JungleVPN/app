import { Loading } from '../../components';
import { useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { getReferralUserId } from '../../utils';
import { ActiveSubscriptionDialog } from '../getSubscription/ActiveSubscriptionDialog';
import { CheckoutForm } from '../getSubscription/CheckoutForm';
import { type CheckoutRequest, useCheckout } from '../getSubscription/useCheckout';
import type { WhopCheckoutState } from '../whopCheckout/whopCheckoutState';

/**
 * Global checkout through Whop: the email step and the order summary, up to
 * the point a payment can begin (mirrors Paddle's). The backend validates the
 * request; the card form itself is mounted on the one dedicated checkout
 * route.
 */
export default function WhopStartCheckoutPage() {
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { paddleCheckoutPath } = useAppRoutes();

  const startCheckout = async ({ email, planId, selectedPeriod }: CheckoutRequest) => {
    const request = {
      email,
      planId,
      toltReferralId: window.tolt_referral ?? null,
      inviterId: getReferralUserId() ?? undefined,
    };
    const { accountId, planId: whopPlanId } = await paymentsApi.createPublicWhopCheckout(request);

    navigate(paddleCheckoutPath, {
      state: { accountId, whopPlanId, request, selectedPeriod } satisfies WhopCheckoutState,
    });
  };

  const checkout = useCheckout(startCheckout);

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
