import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from './Stepper';

const TITLES = ['Account', 'Payment', 'Done'];

const renderSteps = (props: Omit<ComponentProps<typeof Stepper>, 'children'> = {}) =>
  render(
    <Stepper aria-label='Checkout' {...props}>
      {TITLES.map((title) => (
        <Stepper.Step key={title}>
          <Stepper.Indicator />
          <Stepper.Content>
            <Stepper.Title>{title}</Stepper.Title>
          </Stepper.Content>
          <Stepper.Separator />
        </Stepper.Step>
      ))}
    </Stepper>,
  );

const statusOf = (title: string) => screen.getByText(title).closest('li')?.dataset.status;

describe('Stepper', () => {
  it('starts on the first step', () => {
    renderSteps();

    expect(TITLES.map(statusOf)).toEqual(['active', 'inactive', 'inactive']);
  });

  it('marks earlier steps complete and starts at defaultStep', () => {
    renderSteps({ defaultStep: 2 });

    expect(TITLES.map(statusOf)).toEqual(['complete', 'complete', 'active']);
  });

  it('numbers steps that are not complete', () => {
    renderSteps({ currentStep: 1 });

    expect(screen.getByText('2')).toBeDefined();
    expect(screen.queryByText('1')).toBeNull();
  });

  it('is display-only without onStepChange', () => {
    renderSteps();

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('reports the clicked step', () => {
    const onStepChange = vi.fn();
    renderSteps({ onStepChange });

    fireEvent.click(screen.getByRole('button', { name: /Payment/ }));

    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('follows currentStep when controlled', () => {
    function Controlled() {
      const [step, setStep] = useState(0);
      return (
        <Stepper currentStep={step} onStepChange={setStep}>
          {TITLES.map((title) => (
            <Stepper.Step key={title}>
              <Stepper.Indicator />
              <Stepper.Title>{title}</Stepper.Title>
            </Stepper.Step>
          ))}
        </Stepper>
      );
    }
    render(<Controlled />);

    fireEvent.click(screen.getByRole('button', { name: /Done/ }));

    expect(TITLES.map(statusOf)).toEqual(['complete', 'complete', 'active']);
  });

  it('draws no separator after the last step', () => {
    const { container } = renderSteps();

    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(2);
  });
});
