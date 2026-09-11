import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

const { phCapture, isGlobalOrigin } = vi.hoisted(() => ({
  phCapture: vi.fn(),
  isGlobalOrigin: vi.fn(),
}));

vi.mock('../../utils', () => ({ phCapture, isGlobalOrigin }));
vi.mock('../../components', () => ({ FooterSection: () => null }));
vi.mock('../../ui', () => ({
  Container: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('./BentoSection', () => ({ BentoSection: () => null }));
vi.mock('./ComparisonSection', () => ({ ComparisonSection: () => null }));
vi.mock('./CountriesMarquee', () => ({ CountriesMarquee: () => null }));
vi.mock('./FAQSection', () => ({ FAQSection: () => null }));
vi.mock('./FeaturesSection', () => ({ FeaturesSection: () => null }));
vi.mock('./FreeTrialSection', () => ({
  FreeTrialSection: () => <div data-testid='free-trial' />,
}));
vi.mock('./HeroSection', () => ({ HeroSection: () => null }));
vi.mock('./HowItWorksSection', () => ({ HowItWorksSection: () => null }));
vi.mock('./InfoSection', () => ({ InfoSection: () => null }));
vi.mock('./PartnershipSection', () => ({ PartnershipSection: () => null }));
vi.mock('./PlatformsSection', () => ({ PlatformsSection: () => null }));
vi.mock('./PricingSection', () => ({ PricingSection: () => null }));
vi.mock('./TestimonialsSection', () => ({ TestimonialsSection: () => null }));
vi.mock('./TrustSection', () => ({ TrustSection: () => null }));

describe('LandingPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    isGlobalOrigin.mockReturnValue(false);
  });

  it('captures landing_viewed once on mount', () => {
    render(<LandingPage />);

    expect(phCapture).toHaveBeenCalledWith('landing_viewed', { userId: undefined });
    expect(phCapture).toHaveBeenCalledTimes(1);
  });

  // The free trial is a RU-only offer: on the global domains an account is only
  // created once a payment settles, so advertising a trial there would promise
  // something the signup flow never delivers.
  it('offers the free trial on the RU domain', () => {
    render(<LandingPage />);

    expect(screen.getByTestId('free-trial')).toBeDefined();
  });

  it('hides the free trial on the global domains', () => {
    isGlobalOrigin.mockReturnValue(true);

    render(<LandingPage />);

    expect(screen.queryByTestId('free-trial')).toBeNull();
  });
});
