import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WhopCardPanel } from './WhopCardPanel';

vi.mock('@whop/elements-react', () => ({
  Payments: ({ fallback, children }: { fallback?: ReactNode; children?: ReactNode }) => (
    <>
      {fallback}
      {children}
    </>
  ),
  BrandingElement: () => <p>branding</p>,
}));
vi.mock('../../whopCheckout/useWhopCardFields', () => ({
  useWhopCardFields: () => ({ inputs: <p>inputs</p>, canPay: false, submit: () => {} }),
}));

describe('WhopCardPanel', () => {
  it('shows a skeleton of the card form until Whop has loaded every input', () => {
    render(
      <WhopCardPanel
        checkout={{
          accountId: 'biz_1',
          whopPlanId: 'plan_1',
          request: { email: 'payer@test.com', planId: 'whop-30' },
          selectedPeriod: 30,
        }}
        payment={{ pay: vi.fn(), pendingVia: null, isCharging: false, failure: null }}
        returnUrl='https://example.com/return'
        submitRef={{ current: () => {} }}
        onCanPayChange={() => {}}
      />,
    );

    expect(screen.getByTestId('card-inputs-skeleton')).toBeTruthy();
    expect(screen.getByText('inputs')).toBeTruthy();
  });
});
