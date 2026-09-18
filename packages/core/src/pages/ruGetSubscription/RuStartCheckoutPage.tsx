import { Loading } from '../../components';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { getReferralUserId, phCapture, rememberPendingYookassaPayment } from '../../utils';
import { ActiveSubscriptionDialog } from '../getSubscription/ActiveSubscriptionDialog';
import { CheckoutForm } from '../getSubscription/CheckoutForm';
import { type CheckoutRequest, useCheckout } from '../getSubscription/useCheckout';

/**
 * RU checkout through YooKassa: the same email step and order summary as the
 * global page, up to the point a payment can begin.
 *
 * Unlike Paddle, YooKassa has no client-side checkout to mount — the backend
 * creates the payment and answers with a confirmation URL, so this page ends
 * in a redirect out of the app rather than a route change. The payment id is
 * remembered first: `/payment/success` sees the same return URL whether the
 * payer paid or cancelled, and that id is how it tells the two apart.
 */
export default function RuStartCheckoutPage() {
  const paymentsApi = usePaymentsApi();
  const { paymentReturnPath } = useAppRoutes();

  const startCheckout = async ({ email, selectedPeriod }: CheckoutRequest) => {
    const session = await paymentsApi.createPublicYookassaSession({
      email,
      selectedPeriod,
      returnUrl: `${window.location.origin}${paymentReturnPath}`,
      toltReferralId: window.tolt_referral ?? null,
      inviterId: getReferralUserId() ?? undefined,
    });

    if (!session?.url) return;

    rememberPendingYookassaPayment(session.id);
    phCapture('checkout_started', { payment_provider: 'yookassa', months: selectedPeriod });

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
