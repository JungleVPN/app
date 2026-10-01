/**
 * TrialPeriodBanner's CTA — clicking it sends the visitor to the trial
 * plan's checkout and reports the click to PostHog.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { SubscriptionPlanDto } from '@workspace/types';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TrialPeriodBanner } from './TrialPeriodBanner';

const { phCapture, navigate } = vi.hoisted(() => ({ phCapture: vi.fn(), navigate: vi.fn() }));

const TRIAL_PLAN: SubscriptionPlanDto = {
  planId: 'whop-trial-3',
  days: 3,
  countryCode: null,
  isTrial: true,
  planPricing: {
    total: '1.00',
    monthly: '1.00',
    fullTotal: null,
    discountPercent: 0,
    currencyCode: 'EUR',
  },
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));
vi.mock('@heroui/react', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
}));
vi.mock('../../assets/icons/invite-icon.svg?react', () => ({ default: () => null }));
vi.mock('../../ui', () => ({
  Heading: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock('../../hooks', () => ({ useNavigation: () => navigate, usePlans: () => [TRIAL_PLAN] }));
vi.mock('../../runtime', () => ({
  useAppRoutes: () => ({ getSubscriptionPath: (planId: string) => `/payment/${planId}` }),
}));
vi.mock('../../utils', () => ({ phCapture }));

describe('TrialPeriodBanner CTA', () => {
  it('reports the click with the trial plan and sends the visitor to its checkout', () => {
    render(<TrialPeriodBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'common.cta' }));

    expect(phCapture).toHaveBeenCalledWith('trial_banner_cta_clicked', {
      plan_id: 'whop-trial-3',
      days: 3,
    });
    expect(navigate).toHaveBeenCalledWith('/payment/whop-trial-3');
  });
});
