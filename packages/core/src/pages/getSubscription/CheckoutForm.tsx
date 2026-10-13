import type { SubscriptionPlanDto } from '@workspace/types';
import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Stepper, useStepperNavigation } from '../../components';
import { Grid, GridItem } from '../../ui';
import { scrollToTop } from '../../utils';
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

const HALF_WIDTH = { base: 12, sm: 12, md: 12, lg: 6 } as const;

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
  const steps = useStepperNavigation({ stepCount: 2, validateStep: props.completeEmailStep });
  const isEmailStep = !isAuthenticated && steps.currentStep === 0;

  useEffect(() => {
    scrollToTop();
  }, []);

  return (
    <>
      {!isAuthenticated && (
        <Stepper className='mb-6' currentStep={steps.currentStep}>
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

      <Grid className='gap-6'>
        <GridItem size={HALF_WIDTH}>
          {isEmailStep ? (
            <CheckoutEmailStep
              {...props}
              handleNext={steps.goNext}
              isPending={steps.isValidating}
            />
          ) : (
            <CheckoutPaymentStep {...props} isLoading={props.isPaymentLoading} />
          )}
        </GridItem>

        {!isEmailStep && (
          <GridItem size={HALF_WIDTH}>
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
