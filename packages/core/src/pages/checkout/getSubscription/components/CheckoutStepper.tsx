import { useTranslation } from 'react-i18next';
import { Stepper } from '../../../../components';

interface CheckoutStepperProps {
  currentStep: number;
  /** Called with a step other than the one shown; pressing the current step does nothing. */
  onStepSelect: (step: number) => void;
}

/** The checkout's progress: the email step, then the payment step. */
export function CheckoutStepper({ currentStep, onStepSelect }: CheckoutStepperProps) {
  const { t } = useTranslation();

  return (
    <Stepper
      className='mb-6'
      currentStep={currentStep}
      onStepChange={(step) => step !== currentStep && onStepSelect(step)}
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
  );
}
