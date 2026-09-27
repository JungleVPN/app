/**
 * The dedicated checkout route (`/payment/checkout`, `/profile/checkout`)
 * mounts whichever global provider is enabled — the provider switch is one
 * env var, so the route must follow it rather than name a provider.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { provider } = vi.hoisted(() => ({ provider: { current: 'paddle' } }));

vi.mock('../../utils', () => ({
  get GLOBAL_PAYMENT_PROVIDER() {
    return provider.current;
  },
}));
vi.mock('../paddleCheckout/PaddleCheckoutPage', () => ({
  default: ({ fallbackPath }: { fallbackPath?: string }) => <p>paddle {fallbackPath}</p>,
}));
vi.mock('../whopCheckout/WhopCheckoutPage', () => ({
  default: ({ fallbackPath }: { fallbackPath?: string }) => <p>whop {fallbackPath}</p>,
}));

import GlobalCheckoutPage from './GlobalCheckoutPage';

describe('GlobalCheckoutPage', () => {
  it('mounts the Whop checkout when Whop is the global provider', () => {
    provider.current = 'whop';

    render(<GlobalCheckoutPage fallbackPath='/profile/plans' />);

    expect(screen.getByText('whop /profile/plans')).toBeTruthy();
  });

  it('mounts the Paddle checkout otherwise', () => {
    provider.current = 'paddle';

    render(<GlobalCheckoutPage fallbackPath='/profile/plans' />);

    expect(screen.getByText('paddle /profile/plans')).toBeTruthy();
  });
});
