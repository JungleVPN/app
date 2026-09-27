/**
 * WhopCheckoutPage — the one place a Whop checkout is mounted, from the
 * public pricing page and from the profile alike. Whop's own element does
 * the payment; this page only hands it the checkout the backend created.
 */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WhopCheckoutPage from './WhopCheckoutPage';

const { navigate, location, elementsProps, checkoutProps, checkoutElementProps } = vi.hoisted(
  () => ({
    navigate: vi.fn(),
    location: { state: null as unknown },
    elementsProps: vi.fn(),
    checkoutProps: vi.fn(),
    checkoutElementProps: vi.fn(),
  }),
);

vi.mock('@whop/elements', () => ({
  loadWhop: () => 'whop-loader',
  WHOP_ELEMENTS_LOCALES: Object.assign(['en', 'es'], {
    includes: (value: string) => ['en', 'es'].includes(value),
  }),
}));
vi.mock('@whop/elements-react', () => ({
  WhopElements: ({ children, ...props }: { children: ReactNode }) => {
    elementsProps(props);
    return <div data-testid='whop-elements'>{children}</div>;
  },
  Checkout: ({ children, ...props }: { children: ReactNode }) => {
    checkoutProps(props);
    return <>{children}</>;
  },
  CheckoutElement: (props: object) => {
    checkoutElementProps(props);
    return null;
  },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useLocation: () => location }));
vi.mock('../../core/i18n', () => ({ i18n: { language: 'es' } }));
vi.mock('../../hooks', () => ({ useBackButton: () => {}, useNavigation: () => navigate }));
vi.mock('../../runtime', () => ({
  useAppRoutes: () => ({ paymentReturnPath: '/payment/success' }),
}));
vi.mock('../../stores', () => ({ useNavbarStore: () => ({ setNavbarVisible: () => {} }) }));
vi.mock('../../ui', () => ({
  Container: ({ children }: { children: ReactNode }) => <>{children}</>,
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../utils', () => ({ PRICING_PATH: '/pricing' }));

describe('WhopCheckoutPage', () => {
  beforeEach(() => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'sandbox');
    location.state = {
      checkoutConfigurationId: 'ch_1',
      email: 'payer@test.com',
      selectedPeriod: 30,
    };
  });

  it('mounts the checkout configuration the backend created, returning to the success page', async () => {
    render(<WhopCheckoutPage />);

    await screen.findByTestId('whop-elements');
    expect(checkoutProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        checkoutConfiguration: 'ch_1',
        returnUrl: `${window.location.origin}/payment/success`,
      }),
    );
  });

  it('prefills and locks the email the checkout was created for', async () => {
    render(<WhopCheckoutPage />);

    await screen.findByTestId('whop-elements');
    expect(checkoutElementProps).toHaveBeenLastCalledWith({
      buyerEmail: 'payer@test.com',
      lockBuyerEmail: true,
    });
  });

  it("talks to the configured Whop environment, in the visitor's language", async () => {
    render(<WhopCheckoutPage />);

    await screen.findByTestId('whop-elements');
    expect(elementsProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ elements: 'whop-loader', environment: 'sandbox', locale: 'es' }),
    );
  });

  it('sends a visitor with no checkout back to pick a plan', () => {
    location.state = null;

    render(<WhopCheckoutPage />);

    expect(navigate).toHaveBeenCalledWith('/pricing', { replace: true });
    expect(screen.queryByTestId('whop-elements')).toBeNull();
  });

  it('falls back to the path it was given, such as the profile plans page', () => {
    location.state = null;

    render(<WhopCheckoutPage fallbackPath='/profile/plans' />);

    expect(navigate).toHaveBeenCalledWith('/profile/plans', { replace: true });
  });
});
