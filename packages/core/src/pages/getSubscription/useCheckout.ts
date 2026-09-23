import type { SubscriptionPlanDto } from '@workspace/types';
import { type SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { usePlans } from '../../hooks';
import { useAuthStore, usePlanByPeriod, usePlansStatus } from '../../stores';
import { scrollToTop, validateEmail } from '../../utils';
import { isActiveSubscriptionError, isThrottledError } from './checkoutErrors';
import { daysFromSlug } from './planSlug';

const EMPTY_EMAIL_ERROR = 'getSubscription.email_required_error';
const INVALID_EMAIL_ERROR = 'getSubscription.email_invalid_error';
const CHECKOUT_ERROR = 'getSubscription.checkout_error';

/**
 * The backend throttles this route per IP and per email. Telling a throttled
 * visitor to "try again" is the one instruction that cannot work, so the wait
 * is spelled out instead.
 */
const THROTTLED_ERROR = 'getSubscription.throttled_error';

/** What a provider needs to begin a payment: a validated payer and the plan they picked. */
export interface CheckoutRequest {
  email: string;
  selectedPeriod: number;
}

export interface Checkout {
  plan: SubscriptionPlanDto | undefined;
  selectedPeriod: number | null;
  isAuthenticated: boolean;
  /** True until the plans have loaded. */
  isLoading: boolean;
  email: string;
  emailError: string;
  checkoutError: string | null;
  isPending: boolean;
  /** The email whose account already subscribes — also the dialog's open state. */
  activeSubscriptionEmail: string | null;
  handleEmailChange: (value: string) => void;
  handleSubmit: (event: SyntheticEvent) => Promise<void>;
  dismissActiveSubscription: () => void;
}

/**
 * Everything a checkout page does that isn't provider-specific: resolving the
 * plan from the route, email entry and validation, and turning a refused
 * checkout into the right message.
 *
 * A provider supplies only `startCheckout` — what it actually means to begin
 * paying (Stripe and YooKassa redirect to a hosted session, Paddle mounts an
 * inline checkout). It throws on failure; this hook classifies the error.
 */
export function useCheckout(startCheckout: (request: CheckoutRequest) => Promise<void>): Checkout {
  const { planSlug } = useParams();
  const { t } = useTranslation();
  const { authUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeSubscriptionEmail, setActiveSubscriptionEmail] = useState<string | null>(null);

  useEffect(() => {
    scrollToTop();
  }, []);

  // Starts the one-time fetch if the visitor deep-linked here without passing
  // through the landing page; otherwise the store already holds the plans.
  usePlans();

  const status = usePlansStatus();
  const selectedPeriod = daysFromSlug(planSlug);
  const plan = usePlanByPeriod(selectedPeriod);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError('');
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();

    const payerEmail = authUser?.email ?? email;

    if (!payerEmail.trim()) {
      setEmailError(t(EMPTY_EMAIL_ERROR));
      return;
    }
    if (!validateEmail(payerEmail)) {
      setEmailError(t(INVALID_EMAIL_ERROR));
      return;
    }
    if (selectedPeriod === null) return;

    setIsPending(true);
    setCheckoutError(null);
    setActiveSubscriptionEmail(null);
    try {
      await startCheckout({ email: payerEmail, selectedPeriod });
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

  return {
    plan,
    selectedPeriod,
    isAuthenticated: Boolean(authUser),
    isLoading: status === 'idle' || status === 'loading',
    email,
    emailError,
    checkoutError,
    isPending,
    activeSubscriptionEmail,
    handleEmailChange,
    handleSubmit,
    dismissActiveSubscription: () => {
      setEmail('');
      setActiveSubscriptionEmail(null);
    },
  };
}
