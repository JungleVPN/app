import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

const { phCapture } = vi.hoisted(() => ({ phCapture: vi.fn() }));

vi.mock('../../utils', () => ({ phCapture }));
vi.mock('../../components', () => ({ FooterSection: () => null }));
vi.mock('../../ui', () => ({
  Container: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('./BentoSection', () => ({ BentoSection: () => null }));
vi.mock('./ComparisonSection', () => ({ ComparisonSection: () => null }));
vi.mock('./CountriesMarquee', () => ({ CountriesMarquee: () => null }));
vi.mock('./FAQSection', () => ({ FAQSection: () => null }));
vi.mock('./FeaturesSection', () => ({ FeaturesSection: () => null }));
vi.mock('./FreeTrialSection', () => ({ FreeTrialSection: () => null }));
vi.mock('./HeroSection', () => ({ HeroSection: () => null }));
vi.mock('./HowItWorksSection', () => ({ HowItWorksSection: () => null }));
vi.mock('./InfoSection', () => ({ InfoSection: () => null }));
vi.mock('./PartnershipSection', () => ({ PartnershipSection: () => null }));
vi.mock('./PricingSection', () => ({ PricingSection: () => null }));
vi.mock('./TestimonialsSection', () => ({ TestimonialsSection: () => null }));
vi.mock('./TrustSection', () => ({ TrustSection: () => null }));

describe('LandingPage', () => {
  afterEach(cleanup);

  it('captures landing_viewed once on mount', () => {
    render(<LandingPage />);

    expect(phCapture).toHaveBeenCalledWith('landing_viewed', { userId: undefined });
    expect(phCapture).toHaveBeenCalledTimes(1);
  });
});
