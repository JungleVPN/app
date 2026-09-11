import { ACTIVE_SUBSCRIPTION_CODE } from '@workspace/types';
import { type SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { ApiClientError } from '../../api';
import { Loading } from '../../components';
import { useNavigation, usePlans } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { useAuthStore, usePlanByMonths, usePlansStatus } from '../../stores';
import { getReferralUserId, isGlobalOrigin, scrollToTop, validateEmail } from '../../utils';
import { ActiveSubscriptionDialog } from './ActiveSubscriptionDialog';
import { GetSubscriptionComponent } from './GetSubscriptionComponent';
import { monthsFromSlug } from './planSlug';

const EMPTY_EMAIL_ERROR = 'getSubscription.email_required_error';
const INVALID_EMAIL_ERROR = 'getSubscription.email_invalid_error';

const CHECKOUT_ERROR = 'getSubscription.checkout_error';

/**
 * The backend throttles this route per IP and per email. Telling a throttled
 * visitor to "try again" is the one instruction that cannot work, so the wait
 * is spelled out instead.
 */
const THROTTLED_ERROR = 'getSubscription.throttled_error';

/** Whether the backend refused the checkout because the caller was rate limited. */
function isThrottledError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 429;
}

/**
 * Whether the backend refused the checkout because the payer email already has
 * an active subscription, rather than because the payment failed to start.
 */
function isActiveSubscriptionError(error: unknown): boolean {
  if (!(error instanceof ApiClientError) || error.status !== 409) return false;

  const data = error.data;
  // The code is what identifies the case; a 409 from this endpoint means only
  // this today, so an unparsed body is still treated as it.
  if (typeof data !== 'object' || data === null) return true;
  return (data as { code?: string }).code === ACTIVE_SUBSCRIPTION_CODE;
}

export default function GetSubscriptionPage() {
  const { planSlug } = useParams();
  const { t } = useTranslation();
  const { authUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // The email whose account already subscribes — also the dialog's open state.
  const [activeSubscriptionEmail, setActiveSubscriptionEmail] = useState<string | null>(null);
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { profileSubscriptionPath } = useAppRoutes();

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

  const pricing = isRu ? plan?.rub : plan?.eur;

  useEffect(() => {
    scrollToTop();
  }, []);

  const startCheckout = async (payerEmail: string) => {
    if (selectedPeriod === null) return;

    setIsPending(true);
    setCheckoutError(null);
    setActiveSubscriptionEmail(null);
    try {
      const session = await paymentsApi.createPublicStripeSession({
        email: payerEmail,
        selectedPeriod,
        toltReferralId: window.tolt_referral ?? null,
        inviterId: getReferralUserId() ?? undefined,
      });

      if (!session?.url) {
        setCheckoutError(t(CHECKOUT_ERROR));
        return;
      }

      window.location.href = session.url;
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

    await startCheckout(userEmail);
  };

  if (isRu || status === 'idle' || status === 'loading') return <Loading />;

  return (
    <>
      <GetSubscriptionComponent
        isAuthenticated={Boolean(authUser)}
        email={email}
        emailError={emailError}
        checkoutError={checkoutError}
        isPending={isPending}
        isRu={isRu}
        selectedPeriod={selectedPeriod}
        pricing={pricing}
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
