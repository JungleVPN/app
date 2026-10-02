import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePlansStore } from '../../../stores';
import { PlansComponent } from './PlansComponent';

const { loadPlans } = vi.hoisted(() => ({ loadPlans: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../hooks', () => ({ loadPlans }));
vi.mock('../../../components', () => ({
  FeaturesCard: () => null,
  LoadError: ({ reason, onRetry }: { reason: string; onRetry: () => void }) => (
    <button type='button' data-reason={reason} onClick={onRetry}>
      retry
    </button>
  ),
}));
vi.mock('../../../ui', () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  Block: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

const renderPlans = () =>
  render(
    <PlansComponent
      data={[]}
      activePeriod={365}
      onSubmit={() => {}}
      handleSelectionChange={() => {}}
    />,
  );

describe('PlansComponent', () => {
  afterEach(() => {
    cleanup();
    usePlansStore.setState(usePlansStore.getState().actions.getInitialState());
  });

  it('shows no retry while the plans are still loading', () => {
    usePlansStore.setState({ status: 'loading' });

    renderPlans();

    expect(screen.queryByRole('button', { name: 'retry' })).toBeNull();
  });

  // Plans that failed to load used to leave an empty list on a spinner for good.
  it('offers a retry once the plans have failed to load', () => {
    usePlansStore.setState({ status: 'error' });
    renderPlans();
    expect(screen.getByRole('button', { name: 'retry' }).getAttribute('data-reason')).toBe('failed_to_load_plans');

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(loadPlans).toHaveBeenCalledTimes(1);
  });
});
