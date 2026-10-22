/**
 * `/payment/:planId` resolves to whoever takes the payment on this domain.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { env, phCapture } = vi.hoisted(() => ({
  env: { provider: 'whop', scope: 'global' },
  phCapture: vi.fn(),
}));

vi.mock('../../../../utils', () => ({
  get GLOBAL_PAYMENT_PROVIDER() {
    return env.provider;
  },
  currentScope: () => env.scope,
  phCapture,
}));
vi.mock('../../whopGetSubscription/WhopStartCheckoutPage', () => ({ default: () => <p>whop</p> }));
vi.mock('../../ruGetSubscription/RuStartCheckoutPage', () => ({ default: () => <p>yookassa</p> }));

import PreCheckoutPage from '../PreCheckoutPage';

describe('PreCheckoutPage', () => {
  it('starts a Whop checkout on the global storefront', () => {
    env.scope = 'global';

    render(<PreCheckoutPage />);

    expect(screen.getByText('whop')).toBeTruthy();
  });

  it('keeps the RU storefront on YooKassa whatever the global provider is', () => {
    env.scope = 'ru';
    env.provider = 'whop';

    render(<PreCheckoutPage />);

    expect(screen.getByText('yookassa')).toBeTruthy();
  });
});
