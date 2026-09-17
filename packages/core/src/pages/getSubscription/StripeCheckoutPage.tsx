import { Loading } from '../../components';
import { usePaymentsApi } from '../../runtime';
import { getReferralUserId } from '../../utils';
import { ActiveSubscriptionDialog } from './ActiveSubscriptionDialog';
import { CheckoutForm } from './CheckoutForm';
import { type CheckoutRequest, useCheckout } from './useCheckout';

/**
 * Global checkout through Stripe: the backend opens a hosted session and this
 * page hands the payer over to it. Kept behind `GLOBAL_PAYMENT_PROVIDER` as
 * the fallback for Paddle — the flow itself lives in `useCheckout`, so all
 * this file knows is how Stripe starts a payment.
 */
export default function StripeCheckoutPage() {
  const paymentsApi = usePaymentsApi();

  const startCheckout = async ({ email, selectedPeriod }: CheckoutRequest) => {
    const session = await paymentsApi.createPublicStripeSession({
      email,
      selectedPeriod,
      toltReferralId: window.tolt_referral ?? null,
      inviterId: getReferralUserId() ?? undefined,
    });

    if (!session?.url) throw new Error('Stripe returned no checkout URL');

    window.location.href = session.url;
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
