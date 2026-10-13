import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStepperNavigation } from './useStepperNavigation';

describe('useStepperNavigation when the step is controlled', () => {
  it('shows the step it is given', () => {
    const { result } = renderHook(() => useStepperNavigation({ stepCount: 2, step: 1 }));

    expect(result.current.currentStep).toBe(1);
  });

  it('asks for the next step once validation passes, leaving the change to its owner', async () => {
    const onStepChange = vi.fn();
    const { result } = renderHook(() =>
      useStepperNavigation({ stepCount: 2, step: 0, onStepChange, validateStep: () => true }),
    );

    await act(() => result.current.goNext());

    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(result.current.currentStep).toBe(0);
  });

  it('does not ask for a step while validation fails', async () => {
    const onStepChange = vi.fn();
    const { result } = renderHook(() =>
      useStepperNavigation({ stepCount: 2, step: 0, onStepChange, validateStep: () => false }),
    );

    await act(() => result.current.goNext());

    expect(onStepChange).not.toHaveBeenCalled();
  });
});
