import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stepper } from '../Stepper';
import { StepperControls } from '../StepperControls';
import { useStepperNavigation } from '../useStepperNavigation';

const TITLES = ['Account', 'Payment', 'Done'];

function Wizard({ validateStep }: { validateStep?: (step: number) => boolean | Promise<boolean> }) {
  const navigation = useStepperNavigation({ stepCount: TITLES.length, validateStep });
  return (
    <>
      <Stepper currentStep={navigation.currentStep} onStepChange={navigation.goTo}>
        {TITLES.map((title) => (
          <Stepper.Step key={title}>
            <Stepper.Indicator />
            <Stepper.Title>{title}</Stepper.Title>
          </Stepper.Step>
        ))}
      </Stepper>
      <StepperControls navigation={navigation} previousLabel='Back' nextLabel='Next' />
    </>
  );
}

const activeTitle = () =>
  TITLES.find((title) => screen.getByText(title).closest('li')?.dataset.status === 'active');
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
const back = () => fireEvent.click(screen.getByRole('button', { name: 'Back' }));

describe('StepperControls', () => {
  it('moves forward and back', async () => {
    render(<Wizard />);

    next();
    await waitFor(() => expect(activeTitle()).toBe('Payment'));
    back();
    await waitFor(() => expect(activeTitle()).toBe('Account'));
  });

  it('shows no Back button on the first step', async () => {
    render(<Wizard />);

    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    next();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Back' })).toBeDefined());
  });

  it('stays on the last step when Next is pressed there', async () => {
    render(<Wizard />);
    next();
    await waitFor(() => expect(activeTitle()).toBe('Payment'));
    next();
    await waitFor(() => expect(activeTitle()).toBe('Done'));

    next();

    await Promise.resolve();
    expect(activeTitle()).toBe('Done');
  });

  it('validates the last step when Next is pressed there', async () => {
    const checked: number[] = [];
    render(
      <Wizard
        validateStep={(step) => {
          checked.push(step);
          return true;
        }}
      />,
    );
    next();
    await waitFor(() => expect(activeTitle()).toBe('Payment'));
    next();
    await waitFor(() => expect(activeTitle()).toBe('Done'));

    next();

    await waitFor(() => expect(checked).toEqual([0, 1, 2]));
  });

  it('stays put when the current step fails validation', async () => {
    const checked: number[] = [];
    render(
      <Wizard
        validateStep={(step) => {
          checked.push(step);
          return false;
        }}
      />,
    );

    next();

    await waitFor(() => expect(checked).toEqual([0]));
    expect(activeTitle()).toBe('Account');
  });

  it('waits for asynchronous validation', async () => {
    render(<Wizard validateStep={async () => true} />);

    next();

    await waitFor(() => expect(activeTitle()).toBe('Payment'));
  });

  it('does not validate when going back', async () => {
    render(<Wizard validateStep={(step) => step === 0} />);
    next();
    await waitFor(() => expect(activeTitle()).toBe('Payment'));

    back();

    await waitFor(() => expect(activeTitle()).toBe('Account'));
  });

  it('validates the current step before a click on a later step', async () => {
    render(<Wizard validateStep={() => false} />);

    fireEvent.click(screen.getByRole('button', { name: /Done/ }));

    await Promise.resolve();
    expect(activeTitle()).toBe('Account');
  });

  it('jumps back to an earlier step without validating', async () => {
    render(<Wizard validateStep={(step) => step === 0} />);
    next();
    await waitFor(() => expect(activeTitle()).toBe('Payment'));

    fireEvent.click(screen.getByRole('button', { name: /Account/ }));

    await waitFor(() => expect(activeTitle()).toBe('Account'));
  });
});
