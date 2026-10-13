import { useState } from 'react';

type StepperNavigationOptions = {
  stepCount: number;
  defaultStep?: number;
  /** The current step, when the caller owns it (the URL, say); it is then changed through `onStepChange`. */
  step?: number;
  onStepChange?: (step: number) => void;
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
  /** Going back is always allowed; going forward — or pressing Next on the last step — needs the current step to validate. */
  goTo: (step: number) => Promise<void>;
};

export function useStepperNavigation({
  stepCount,
  defaultStep = 0,
  step,
  onStepChange,
  validateStep,
}: StepperNavigationOptions): StepperNavigation {
  const [internalStep, setInternalStep] = useState(defaultStep);
  const currentStep = step ?? internalStep;
  const setCurrentStep = (next: number) => {
    setInternalStep(next);
    onStepChange?.(next);
  };
  const [isValidating, setIsValidating] = useState(false);
  const lastStep = stepCount - 1;

  const goTo = async (step: number) => {
    const target = Math.min(Math.max(step, 0), lastStep);
    if (isValidating) return;
    if (target < currentStep) return setCurrentStep(target);
    if (target === currentStep && currentStep !== lastStep) return;
    if (!validateStep) return setCurrentStep(target);

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
