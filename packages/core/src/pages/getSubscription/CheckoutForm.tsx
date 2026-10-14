import type { SubscriptionPlanDto } from '@workspace/types';
import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Stepper, useStepperNavigation } from '../../components';
import { scrollToTop } from '../../utils';
import { trackEmailStepSubmitted, trackEmailStepViewed } from '../../utils/checkoutAnalytics';
import { getCheckoutEmail, saveCheckoutEmail } from '../../utils/checkoutEmail';
import { TermsDialog } from '../profile/payment/components/TermsDialog';
import { CheckoutEmailStep } from './CheckoutEmailStep';
import { CheckoutOrderSummary } from './CheckoutOrderSummary';
import { CheckoutPaymentStep } from './CheckoutPaymentStep';

interface CheckoutFormProps {
  isAuthenticated: boolean;
  email: string;
  emailError: string;
  checkoutError: string | null;
  isPending: boolean;
  selectedPeriod: number | null;
  plan: SubscriptionPlanDto | undefined;
  /** False while the provider still can't start a payment — no plan, or its SDK not loaded yet. */
  canSubmit: boolean;
  /** A provider's promo code entry, shown with the order summary. */
  promoCodeSlot?: ReactNode;
  /** A provider's payment method choice, shown in the payment step under its heading. */
  paymentMethodsSlot?: ReactNode;
  /** True while the payment methods are still loading. */
  isPaymentLoading?: boolean;
  /** Replaces the default submit button in the payment step. */
  submitSlot?: ReactNode;
  /** Leaves out the purchase agreement in the payment step. */
  hideAgreement?: boolean;
  /**
   * An applied promo code's effect on the order, replacing the plan's own
   * discount: `total` is the new amount, absent when the saving can't be
   * priced, and `label` names the saving.
   */
  promoDiscount?: { total?: string; label: string };
  /** Shown under the order when the provider guarantees the price already includes tax. */
  taxNote?: string;
  /** Finishes the email step — resolves true to move on to payment; shows its own reason when not. */
  completeEmailStep: () => boolean | Promise<boolean>;
  handleSubmit: () => void;
  handleEmailChange: (value: string) => void;
}

const STEP_PARAM = 'step';
const PAYMENT_STEP = 'payment';

/**
 * The global checkout page's markup, shared by every payment provider. A
 * visitor goes through two steps: their email, which must pass validation
 * before Next moves on, then payment beside the order summary, where submit
 * validates the email again and checks for an active subscription before
 * carrying them to the provider's own route. A signed-in payer has no email to
 * give and starts at the payment step. A provider reaches this form only
 * through `canSubmit`; see `useCheckout` for the flow behind it.
 */
export const CheckoutForm = (props: CheckoutFormProps) => {
  const { isAuthenticated, plan, selectedPeriod, promoCodeSlot, promoDiscount, taxNote } = props;
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStep = searchParams.get(STEP_PARAM) === PAYMENT_STEP ? 1 : 0;
  const moveToStep = (step: number, options?: { replace: boolean }) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (step === 1) next.set(STEP_PARAM, PAYMENT_STEP);
      else next.delete(STEP_PARAM);
      return next;
    }, options);
  const steps = useStepperNavigation({
    stepCount: 2,
    step: urlStep,
    onStepChange: moveToStep,
    validateStep: async () => {
      const isAccepted = await props.completeEmailStep();
      if (isAccepted) saveCheckoutEmail(props.email);
      trackEmailStepSubmitted({ days: selectedPeriod });
      return isAccepted;
    },
  });
  const isEmailStep = !isAuthenticated && steps.currentStep === 0;

  useEffect(() => {
    if (isEmailStep) trackEmailStepViewed({ days: selectedPeriod });
  }, [isEmailStep, selectedPeriod]);

  // A reload of the payment step has lost the accepted checkout, so the stored
  // email is accepted again; the email step is the way back when it cannot be.
  const isReloadedOnPayment = useRef(!isAuthenticated && urlStep === 1);
  useEffect(() => {
    if (!isReloadedOnPayment.current || isAuthenticated) return;
    if (!props.email) {
      if (!getCheckoutEmail()) {
        isReloadedOnPayment.current = false;
        moveToStep(0, { replace: true });
      }
      return;
    }
    isReloadedOnPayment.current = false;
    void Promise.resolve(props.completeEmailStep()).then((isAccepted) => {
      if (!isAccepted) moveToStep(0, { replace: true });
    });
  });

  useEffect(() => {
    scrollToTop();
  }, []);

  return (
    <>
      {!isAuthenticated && (
        <Stepper
          className='mb-6'
          currentStep={steps.currentStep}
          onStepChange={(step) => step !== steps.currentStep && steps.goTo(step)}
        >
          <Stepper.Step>
            <Stepper.Indicator />
            <Stepper.Title>{t('getSubscription.step_email_title')}</Stepper.Title>
            <Stepper.Separator />
          </Stepper.Step>
          <Stepper.Step>
            <Stepper.Indicator />
            <Stepper.Title>{t('getSubscription.step_payment_title')}</Stepper.Title>
          </Stepper.Step>
        </Stepper>
      )}

      <div className='gap-6 flex flex-col md:flex-row max-w-lg md:max-w-7xl m-auto w-full'>
        {isEmailStep ? (
          <div className={'max-w-lg m-auto w-full'}>
            <CheckoutEmailStep
              {...props}
              handleNext={steps.goNext}
              isPending={steps.isValidating}
            />
          </div>
        ) : (
          <CheckoutPaymentStep {...props} isLoading={props.isPaymentLoading} />
        )}

        {!isEmailStep && (
          <CheckoutOrderSummary
            plan={plan}
            selectedPeriod={selectedPeriod}
            promoCodeSlot={promoCodeSlot}
            promoDiscount={promoDiscount}
            taxNote={taxNote}
          />
        )}
      </div>

      <TermsDialog />
    </>
  );
};
