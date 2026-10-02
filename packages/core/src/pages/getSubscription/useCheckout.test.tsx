import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PlansStatus, usePlansStore } from '../../stores';
import { useCheckout } from './useCheckout';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../hooks', () => ({ usePlans: () => [] }));
vi.mock('../../utils', () => ({ scrollToTop: () => {}, validateEmail: () => true }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/payment/plan-30']}>
    <Routes>
      <Route path='/payment/:planId' element={children} />
    </Routes>
  </MemoryRouter>
);

const checkoutWithPlans = (status: PlansStatus) => {
  usePlansStore.setState({ status });
  return renderHook(() => useCheckout(async () => {}), { wrapper }).result.current;
};

describe('useCheckout: loading the plan', () => {
  afterEach(() => {
    usePlansStore.setState(usePlansStore.getState().actions.getInitialState());
  });

  it('is loading while the plans are on their way', () => {
    const checkout = checkoutWithPlans('loading');

    expect(checkout.isLoading).toBe(true);
    expect(checkout.loadFailed).toBe(false);
  });

  // Without the plan there is nothing to pay for, and the form used to sit
  // there with a disabled button and no word of why.
  it('reports a failed load once the plans could not be fetched', () => {
    const checkout = checkoutWithPlans('error');

    expect(checkout.isLoading).toBe(false);
    expect(checkout.loadFailed).toBe(true);
  });

  it('reports no failure once the plans have loaded', () => {
    const checkout = checkoutWithPlans('loaded');

    expect(checkout.loadFailed).toBe(false);
  });
});
