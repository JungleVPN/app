import { useEffect } from 'react';
import { Container, Reveal, RoundedSection } from '../../../ui';
import { phCapture } from '../../../utils';
import { BentoFeaturesStack } from './BentoFeaturesStack';
import { ComparisonSection } from './ComparisonSection';
import { CountriesMarquee } from './CountriesMarquee';
import { FAQSection } from './FAQSection';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { InfoSection } from './InfoSection';
import { PartnershipSection } from './PartnershipSection';
import { PlatformsSection } from './PlatformsSection';
import { PricingSection } from './PricingSection';
import { TrialPeriodBanner } from './TrialPeriodBanner';
import { TrustSection } from './TrustSection';

export default function LandingPage() {
  useEffect(() => {
    phCapture('landing_viewed');
  }, []);

  return (
    <div className='relative bg-[#1a1a1a]'>
      <div className='relative md:sticky top-0 z-10 bg-[#1a1a1a] overflow-hidden pt-42 pb-24 md:py-56 lg:pt-56 lg:pb-20'>
        <div className='inset-0 pointer-events-none opacity-40 overflow-hidden'>
          <div
            className='absolute inset-0 blur-3xl'
            style={{
              backgroundImage:
                'radial-gradient(40% 60% at 100% 30%, rgba(142, 81, 255, 0.9) 0%, rgba(142, 81, 255, 0.35) 40%, transparent 75%),' +
                'radial-gradient(40% 60% at 0% 55%, rgba(229, 117, 117, 0.9) 0%, rgba(229, 117, 117, 0.35) 40%, transparent 75%)',
            }}
          />
        </div>
        <Container>
          <HeroSection />
        </Container>
      </div>
      <RoundedSection className='z-20' rounded>
        <Container>
          <TrustSection />
        </Container>
        <Reveal>
          <CountriesMarquee />
        </Reveal>
        <Container>
          <Reveal>
            <PlatformsSection />
          </Reveal>
        </Container>
        <Container>
          <Reveal amount={0.1}>
            <BentoFeaturesStack />
          </Reveal>
        </Container>
      </RoundedSection>

      <div className='relative z-10'>
        <RoundedSection rounded variant={'secondary'} className={'-mt-40 md:-mt-40'}>
          <Container id='how-it-works' className={'pt-60'}>
            <Reveal>
              <HowItWorksSection />
            </Reveal>
          </Container>
          <Container className='p-20 bg-background rounded-4xl'>
            <PricingSection animateOnMount />
          </Container>
          <Container>
            <Reveal>
              <ComparisonSection />
            </Reveal>
          </Container>
          <Container id='pricing'>
            <Reveal>
              <TrialPeriodBanner />
            </Reveal>
          </Container>
          <Container>
            <Reveal>
              <InfoSection />
            </Reveal>
          </Container>
          <Container id='partnership'>
            <Reveal>
              <PartnershipSection />
            </Reveal>
          </Container>
          <Container id='faq'>
            <Reveal>
              <FAQSection />
            </Reveal>
          </Container>
          <Container>
            <Reveal>
              <TrialPeriodBanner />
            </Reveal>
          </Container>
        </RoundedSection>
      </div>
    </div>
  );
}
