import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useStepperNavigation } from '../../../components';
import { trackEmailStepSubmitted, trackEmailStepViewed } from '../../../utils';
import { getCheckoutEmail, saveCheckoutEmail } from '../../../utils/checkoutEmail';

const STEP_PARAM = 'step';
const PAYMENT_STEP = 'payment';

const EMAIL_STEP_INDEX = 0;
const PAYMENT_STEP_INDEX = 1;

interface UseCheckoutStepsOptions {
  isAuthenticated: boolean;
  email: string;
  selectedPeriod: number | null;
  /** Finishes the email step — resolves true to move on to payment. */
  completeEmailStep: () => boolean | Promise<boolean>;
}

/** `params` with the step in it: the payment step has its own URL, the email step none. */
function withStep(params: URLSearchParams, step: number): URLSearchParams {
  const next = new URLSearchParams(params);
  if (step === PAYMENT_STEP_INDEX) next.set(STEP_PARAM, PAYMENT_STEP);
  else next.delete(STEP_PARAM);
  return next;
}

/**
 * The checkout's two steps — email, then payment — kept in the URL so a reload
 * or the back button lands on the same one. Next completes the email step
 * before moving on, and a reload of the payment step accepts the stored email
 * again. A signed-in payer has no email step.
 */
export function useCheckoutSteps({
  isAuthenticated,
  email,
  selectedPeriod,
  completeEmailStep,
}: UseCheckoutStepsOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStep =
    searchParams.get(STEP_PARAM) === PAYMENT_STEP ? PAYMENT_STEP_INDEX : EMAIL_STEP_INDEX;
  const moveToStep = (step: number, options?: { replace: boolean }) =>
    setSearchParams((previous) => withStep(previous, step), options);
  const backToEmailStep = () => moveToStep(EMAIL_STEP_INDEX, { replace: true });

  const steps = useStepperNavigation({
    stepCount: 2,
    step: urlStep,
    onStepChange: moveToStep,
    validateStep: async () => {
      const isAccepted = await completeEmailStep();
      if (isAccepted) saveCheckoutEmail(email);
      trackEmailStepSubmitted({ days: selectedPeriod });
      return isAccepted;
    },
  });
  const isEmailStep = !isAuthenticated && steps.currentStep === EMAIL_STEP_INDEX;

  useEffect(() => {
    if (isEmailStep) trackEmailStepViewed({ days: selectedPeriod });
  }, [isEmailStep, selectedPeriod]);

  // A reload of the payment step has lost the accepted checkout, so the stored
  // email is accepted again; the email step is the way back when it cannot be.
  const isReloadedOnPayment = useRef(!isAuthenticated && urlStep === PAYMENT_STEP_INDEX);
  useEffect(() => {
    if (!isReloadedOnPayment.current || isAuthenticated) return;
    if (!email) {
      if (getCheckoutEmail()) return;
      isReloadedOnPayment.current = false;
      backToEmailStep();
      return;
    }
    isReloadedOnPayment.current = false;
    void Promise.resolve(completeEmailStep()).then((isAccepted) => {
      if (!isAccepted) backToEmailStep();
    });
  });

  return {
    currentStep: steps.currentStep,
    isEmailStep,
    isValidating: steps.isValidating,
    goNext: steps.goNext,
    goTo: steps.goTo,
  };
}
