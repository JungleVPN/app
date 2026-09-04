import { useEffect } from 'react';
import { FooterSection } from '../../components';
import { useAuthStore } from '../../stores';
import { Container } from '../../ui';
import { phCapture } from '../../utils';
import { BentoSection } from './BentoSection';
import { ComparisonSection } from './ComparisonSection';
import { CountriesMarquee } from './CountriesMarquee';
import { FAQSection } from './FAQSection';
import { FeaturesSection } from './FeaturesSection';
import { FreeTrialSection } from './FreeTrialSection';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { InfoSection } from './InfoSection';
import { PartnershipSection } from './PartnershipSection';
import { PricingSection } from './PricingSection';
import { TestimonialsSection } from './TestimonialsSection';
import { TrustSection } from './TrustSection';

export default function LandingPage() {
  const { rmnUser } = useAuthStore();

  useEffect(() => {
    phCapture('landing_viewed', { userId: rmnUser?.id });
  }, [rmnUser]);

  return (
    <div className='relative bg-[#1a1a1a]'>
      <div className='sticky top-0 overflow-hidden pt-42 pb-32 md:py-56 lg:py-72'>
        <div className='inset-0 pointer-events-none opacity-40 overflow-hidden'>
          <div
            className='absolute inset-0 blur-3xl'
            style={{
              backgroundImage:
                'radial-gradient(60% 60% at 20% 15%, #ffb900 0%, transparent 70%),' +
                'radial-gradient(60% 60% at 80% 10%, #8e51ff 0%, transparent 70%),' +
                'radial-gradient(60% 60% at 50% 55%, #E57575 0%, transparent 70%)',
            }}
          />
        </div>
        <Container maxWidth={'md'}>
          <HeroSection />
        </Container>
      </div>
      <div
        className={
          'flex flex-col gap-48 relative z-10 bg-background rounded-t-[4rem] py-12 md:py-8 overflow-hidden'
        }
      >
        <Container>
          <TrustSection />
        </Container>
        <CountriesMarquee />
        <Container id='how-it-works'>
          <HowItWorksSection />
        </Container>
        <Container>
          <FeaturesSection />
        </Container>
      </div>
      <div className={'flex flex-col gap-56 relative bg-background -mt-24 pt-64 overflow-hidden'}>
        <Container>
          <BentoSection />
        </Container>
        <Container>
          <ComparisonSection />
        </Container>
        <Container id='pricing'>
          <PricingSection />
        </Container>
        <div id='testimonials'>
          <TestimonialsSection />
        </div>
        <Container id='faq'>
          <FAQSection />
        </Container>
        <Container>
          <FreeTrialSection />
        </Container>
        <Container id='partnership'>
          <PartnershipSection />
        </Container>
        <Container>
          <InfoSection />
        </Container>
        <Container>
          <FreeTrialSection />
        </Container>
        <Container>
          <FooterSection />
        </Container>
      </div>
    </div>
  );
}
