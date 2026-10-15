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
vi.mock('../../whopCheckout/hooks/useWhopCardFields', () => ({
  useWhopCardFields: () => ({ inputs: <p>inputs</p>, canPay: false, submit: () => {} }),
}));

describe('WhopCardPanel', () => {
  it('shows a spinner in the card form’s place until Whop has loaded every input', () => {
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

    const placeholder = screen.getByTestId('card-inputs-loading');
    expect(placeholder.querySelector('[aria-label="Loading"]')).not.toBeNull();
    expect(screen.queryByTestId('card-inputs-skeleton')).toBeNull();
    expect(screen.getByText('inputs')).toBeTruthy();
  });
});
