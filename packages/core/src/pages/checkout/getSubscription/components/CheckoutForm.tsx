import type { SubscriptionPlanDto } from '@workspace/types';
import { type ReactNode, useEffect } from 'react';
import { Grid, GridItem } from '../../../../ui';
import { scrollToTop } from '../../../../utils';
import { TermsDialog } from '../../../profile/payment/components/TermsDialog';
import { useCheckoutSteps } from '../hooks/useCheckoutSteps';
import { CheckoutEmailStep } from './CheckoutEmailStep';
import { CheckoutOrderSummary, type PromoDiscount } from './CheckoutOrderSummary';
import { CheckoutPaymentStep } from './CheckoutPaymentStep';
import { CheckoutStepper } from './CheckoutStepper';

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
  /**
   * Loads the payment step behind the email step, out of sight and reach, so
   * payment methods that take long to load — a provider's hosted frames — are
   * ready when the payer moves on. It opens in place, never remounted.
   */
  preloadPaymentStep?: boolean;
  /** Replaces the default submit button in the payment step. */
  submitSlot?: ReactNode;
  /** Leaves out the purchase agreement in the payment step. */
  hideAgreement?: boolean;
  promoDiscount?: PromoDiscount;
  /** Shown under the order when the provider guarantees the price already includes tax. */
  taxNote?: string;
  /** Finishes the email step — resolves true to move on to payment; shows its own reason when not. */
  completeEmailStep: () => boolean | Promise<boolean>;
  handleSubmit: () => void;
  handleEmailChange: (value: string) => void;
}

const HALF_WIDTH = '@3xl:col-span-6';

const CENTERED_HALF_WIDTH = `${HALF_WIDTH} @3xl:col-start-4`;

/** Shares the email step's row, so the hidden payment step adds no gap below it. */
const BEHIND_EMAIL_STEP = `${HALF_WIDTH} row-start-1 invisible h-0 overflow-hidden`;

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
  const steps = useCheckoutSteps({
    isAuthenticated,
    email: props.email,
    selectedPeriod,
    completeEmailStep: props.completeEmailStep,
  });

  useEffect(() => {
    scrollToTop();
  }, []);

  return (
    <>
      {!isAuthenticated && (
        <CheckoutStepper currentStep={steps.currentStep} onStepSelect={steps.goTo} />
      )}

      {/* Each step keeps its own place among the grid's children, so a payment
          step loaded behind the email step is the same one the payer reaches. */}
      <Grid className='@container mb-8'>
        {steps.isEmailStep && (
          <GridItem className={CENTERED_HALF_WIDTH}>
            <CheckoutEmailStep
              {...props}
              handleNext={steps.goNext}
              isPending={steps.isValidating}
            />
          </GridItem>
        )}
        {(!steps.isEmailStep || props.preloadPaymentStep) && (
          <GridItem className={steps.isEmailStep ? BEHIND_EMAIL_STEP : HALF_WIDTH}>
            <div inert={steps.isEmailStep}>
              <CheckoutPaymentStep {...props} isLoading={props.isPaymentLoading} />
            </div>
          </GridItem>
        )}
        {!steps.isEmailStep && (
          <GridItem className={HALF_WIDTH}>
            <CheckoutOrderSummary
              plan={plan}
              selectedPeriod={selectedPeriod}
              promoCodeSlot={promoCodeSlot}
              promoDiscount={promoDiscount}
              taxNote={taxNote}
            />
          </GridItem>
        )}
      </Grid>

      <TermsDialog />
    </>
  );
};
