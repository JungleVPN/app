/**
 * `/payment/:planId` resolves to whoever takes the payment on this domain.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { env, phCapture } = vi.hoisted(() => ({
  env: { provider: 'paddle', scope: 'global' },
  phCapture: vi.fn(),
}));

vi.mock('../../utils', () => ({
  get GLOBAL_PAYMENT_PROVIDER() {
    return env.provider;
  },
  currentScope: () => env.scope,
  phCapture,
}));
vi.mock('../paddleGetSubscription/PaddleStartCheckoutPage', () => ({
  default: () => <p>paddle</p>,
}));
vi.mock('../whopGetSubscription/WhopStartCheckoutPage', () => ({ default: () => <p>whop</p> }));
vi.mock('../ruGetSubscription/RuStartCheckoutPage', () => ({ default: () => <p>yookassa</p> }));
vi.mock('./StripeCheckoutPage', () => ({ default: () => <p>stripe</p> }));

import PreCheckoutPage from './PreCheckoutPage';

describe('PreCheckoutPage', () => {
  it.each([
    ['whop', 'whop'],
    ['paddle', 'paddle'],
    ['stripe', 'stripe'],
  ])('starts a %s checkout when %s is the global provider', (configured, expected) => {
    env.scope = 'global';
    env.provider = configured;

    render(<PreCheckoutPage />);

    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('keeps the RU storefront on YooKassa whatever the global provider is', () => {
    env.scope = 'ru';
    env.provider = 'whop';

    render(<PreCheckoutPage />);

    expect(screen.getByText('yookassa')).toBeTruthy();
  });

  it('reports the pre-checkout page being viewed', () => {
    render(<PreCheckoutPage />);

    expect(phCapture).toHaveBeenCalledWith('pre_checkout_page_viewed');
  });
});
