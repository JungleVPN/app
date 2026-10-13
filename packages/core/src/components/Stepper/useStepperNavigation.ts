import { useState } from 'react';

type StepperNavigationOptions = {
  stepCount: number;
  defaultStep?: number;
  /** Whether the step's content is valid; moving forward from a step waits for a true. */
  validateStep?: (step: number) => boolean | Promise<boolean>;
};

export type StepperNavigation = {
  currentStep: number;
  isFirst: boolean;
  isLast: boolean;
  isValidating: boolean;
  goNext: () => Promise<void>;
  goPrevious: () => void;
  /** Going back is always allowed; going forward needs the current step to validate. */
  goTo: (step: number) => Promise<void>;
};

export function useStepperNavigation({
  stepCount,
  defaultStep = 0,
  validateStep,
}: StepperNavigationOptions): StepperNavigation {
  const [currentStep, setCurrentStep] = useState(defaultStep);
  const [isValidating, setIsValidating] = useState(false);
  const lastStep = stepCount - 1;

  const goTo = async (step: number) => {
    const target = Math.min(Math.max(step, 0), lastStep);
    if (target === currentStep || isValidating) return;
    if (target < currentStep || !validateStep) return setCurrentStep(target);

    setIsValidating(true);
    try {
      if (await validateStep(currentStep)) setCurrentStep(target);
    } finally {
      setIsValidating(false);
    }
  };

  return {
    currentStep,
    isFirst: currentStep === 0,
    isLast: currentStep === lastStep,
    isValidating,
    goNext: () => goTo(currentStep + 1),
    goPrevious: () => void goTo(currentStep - 1),
    goTo,
  };
}
