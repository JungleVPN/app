import { act, renderHook, waitFor } from '@testing-library/react';
import type { SubscriptionPlanDto } from '@workspace/types';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PlansStatus, useAuthStore, usePlansStore } from '../../../../../stores';
import { saveCheckoutEmail } from '../../../../../utils/payment/checkoutEmail';
import { type CheckoutRequest, useCheckout } from '../useCheckout';

const { phIdentifyGuestCheckout } = vi.hoisted(() => ({ phIdentifyGuestCheckout: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../../../hooks', () => ({ usePlans: () => [] }));
vi.mock('../../../../../utils', () => ({
  scrollToTop: () => {},
  validateEmail: () => true,
  phIdentifyGuestCheckout,
}));

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

describe('useCheckout: the stored email', () => {
  afterEach(() => {
    localStorage.clear();
    usePlansStore.setState(usePlansStore.getState().actions.getInitialState());
  });

  it('starts from the email stored on an earlier visit', async () => {
    saveCheckoutEmail('payer@test.com');
    usePlansStore.setState({ status: 'loaded' });

    const { result } = renderHook(() => useCheckout(async () => {}), { wrapper });

    await waitFor(() => expect(result.current.email).toBe('payer@test.com'));
  });

  it('starts empty when nothing is stored', () => {
    usePlansStore.setState({ status: 'loaded' });

    const { result } = renderHook(() => useCheckout(async () => {}), { wrapper });

    expect(result.current.email).toBe('');
  });
});

const plan30: SubscriptionPlanDto = {
  planId: 'plan-30',
  days: 30,
  countryCode: null,
  isTrial: false,
  planPricing: {
    total: '10.00',
    monthly: '10.00',
    fullTotal: null,
    discountPercent: 0,
    currencyCode: 'EUR',
  },
};

/** Submits the checkout as a visitor typing `email`, recording what happened in order. */
async function submitCheckout(email: string) {
  const steps: string[] = [];
  phIdentifyGuestCheckout.mockImplementation((address: string) =>
    steps.push(`identify ${address}`),
  );
  const startCheckout = async (request: CheckoutRequest) => {
    steps.push(`start ${request.email}`);
  };
  usePlansStore.setState({ status: 'loaded', plans: [plan30] });
  const { result } = renderHook(() => useCheckout(startCheckout), { wrapper });

  act(() => result.current.handleEmailChange(email));
  await act(async () => {
    await result.current.handleSubmit();
  });
  return steps;
}

// A guest's browser is anonymous in PostHog, so their plan choice, checkout and
// replay could not be tied to the account their payment creates.
describe('useCheckout: tying a guest checkout to the buyer', () => {
  afterEach(() => {
    localStorage.clear();
    useAuthStore.getState().actions.setAuthUser(null);
    usePlansStore.setState(usePlansStore.getState().actions.getInitialState());
  });

  it('identifies a guest by the email they pay with, before the checkout starts', async () => {
    const steps = await submitCheckout('payer@test.com');

    expect(steps).toEqual(['identify payer@test.com', 'start payer@test.com']);
  });

  it('leaves a signed-in visitor to the identity their login gave them', async () => {
    useAuthStore.getState().actions.setAuthUser({ id: 'auth-1', email: 'member@test.com' });

    const steps = await submitCheckout('');

    expect(steps).toEqual(['start member@test.com']);
  });

  it('identifies nobody when the email does not pass the check', async () => {
    const steps = await submitCheckout('   ');

    expect(steps).toEqual([]);
  });
});
