import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlatformStore } from '../../stores';
import PaddleCheckoutPage from './PaddleCheckoutPage';
import type { PaddleCheckoutState } from './paddleCheckoutState';

const { checkoutOpen, initializePaddle, navigate, phCapture } = vi.hoisted(() => ({
  checkoutOpen: vi.fn(),
  initializePaddle: vi.fn(),
  navigate: vi.fn(),
  phCapture: vi.fn(),
}));

vi.mock('../../utils', () => ({ phCapture }));

vi.mock('@paddle/paddle-js', () => ({
  initializePaddle,
}));

vi.mock('./paddleEnv', () => ({
  getPaddleClientToken: () => 'test-token',
  getPaddleEnvironment: () => 'sandbox',
}));

vi.mock('@tma.js/sdk-react', () => ({
  backButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
}));

// useBackButton stays real so the rendered back button is the one users get.
vi.mock('../../hooks', async (importActual) => ({
  ...(await importActual<typeof import('../../hooks')>()),
  useNavigation: () => navigate,
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('../../runtime', () => ({
  useAppRoutes: () => ({
    paymentReturnPath: '/payment/success',
    publicPlansPath: '/plans',
    profilePlansPath: '/profile/plans',
  }),
}));

vi.mock('../../ui', async () => {
  const { Page } = await import('../../ui/Page');
  return { Page };
});

vi.mock('../../components', () => ({
  Loading: () => <span>loading</span>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const validState: PaddleCheckoutState = {
  priceId: 'pri_123',
  customData: { userEmail: 'payer@test.com' },
  email: 'payer@test.com',
  countryCode: 'DE',
  selectedPeriod: 3,
};

function renderPage(state: unknown, fallbackPath?: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/payment/checkout', state }]}>
      <Routes>
        <Route
          path={'/payment/checkout'}
          element={<PaddleCheckoutPage fallbackPath={fallbackPath} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PaddleCheckoutPage', () => {
  beforeEach(() => {
    usePlatformStore.setState({ platformType: 'web' });
    initializePaddle.mockResolvedValue({ Checkout: { open: checkoutOpen } });
  });

  it('renders the page title', async () => {
    renderPage(validState);

    expect(await screen.findByRole('heading', { name: 'paddleCheckout.title' })).toBeTruthy();
  });

  it('renders a back button out of the checkout', async () => {
    renderPage(validState);

    expect(await screen.findByRole('button', { name: 'a11y.back' })).toBeTruthy();
  });

  it('renders the container Paddle mounts its inline checkout into', async () => {
    const { container } = renderPage(validState);

    await waitFor(() => expect(checkoutOpen).toHaveBeenCalled());

    expect(container.querySelector('.paddle-checkout-frame')).toBeTruthy();
  });

  it('opens the checkout inline rather than as an overlay', async () => {
    renderPage(validState);

    await waitFor(() => expect(checkoutOpen).toHaveBeenCalled());

    const settings = checkoutOpen.mock.calls[0][0].settings;
    expect(settings.displayMode).toBe('inline');
    expect(settings.frameTarget).toBe('paddle-checkout-frame');
  });

  it('never presents a separate "Your details" step, whatever the payer\'s country', async () => {
    renderPage({ ...validState, countryCode: null });

    await waitFor(() => expect(checkoutOpen).toHaveBeenCalled());

    expect(checkoutOpen.mock.calls[0][0].settings.variant).toBe('one-page');
  });

  it('prefills email and country so those fields arrive already filled in', async () => {
    renderPage(validState);

    await waitFor(() => expect(checkoutOpen).toHaveBeenCalled());

    expect(checkoutOpen.mock.calls[0][0].customer).toEqual({
      email: 'payer@test.com',
      address: { countryCode: 'DE' },
    });
  });

  it('bills the price the entry point already resolved, carrying its custom data', async () => {
    renderPage(validState);

    await waitFor(() => expect(checkoutOpen).toHaveBeenCalled());

    expect(checkoutOpen.mock.calls[0][0].items).toEqual([{ priceId: 'pri_123', quantity: 1 }]);
    expect(checkoutOpen.mock.calls[0][0].customData).toEqual({ userEmail: 'payer@test.com' });
  });

  it('opens the checkout only once when the page re-renders', async () => {
    const { rerender } = renderPage(validState);

    await waitFor(() => expect(checkoutOpen).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter initialEntries={[{ pathname: '/payment/checkout', state: validState }]}>
        <Routes>
          <Route path={'/payment/checkout'} element={<PaddleCheckoutPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(checkoutOpen).toHaveBeenCalledTimes(1));
  });

  it('reports the checkout reaching the payer, with the plan they are buying', async () => {
    renderPage(validState);

    await waitFor(() => expect(checkoutOpen).toHaveBeenCalled());

    expect(phCapture).toHaveBeenCalledWith('paddle_checkout_viewed', { months: 3 });
  });

  it('reports the checkout once, not again on every re-render', async () => {
    const { rerender } = renderPage(validState);

    await waitFor(() => expect(phCapture).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter initialEntries={[{ pathname: '/payment/checkout', state: validState }]}>
        <Routes>
          <Route path={'/payment/checkout'} element={<PaddleCheckoutPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(phCapture).toHaveBeenCalledTimes(1));
  });

  it('reports nothing when there is no checkout to render', async () => {
    renderPage(undefined);

    await waitFor(() => expect(navigate).toHaveBeenCalled());

    expect(phCapture).not.toHaveBeenCalled();
  });

  it('sends a visitor who landed here without a started checkout back to the plans', async () => {
    renderPage(undefined);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/plans', { replace: true }));

    expect(checkoutOpen).not.toHaveBeenCalled();
  });

  it('treats a checkout missing its plan period as no checkout at all', async () => {
    const { selectedPeriod: _omitted, ...withoutPeriod } = validState;

    renderPage(withoutPeriod);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/plans', { replace: true }));

    expect(checkoutOpen).not.toHaveBeenCalled();
  });

  it('falls back to the path the route configured, so the profile flow stays in the profile', async () => {
    renderPage(null, '/profile/plans');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/profile/plans', { replace: true }));
  });
});
