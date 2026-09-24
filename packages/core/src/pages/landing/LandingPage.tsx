import { useEffect } from 'react';
import { Container, Reveal, RoundedSection } from '../../ui';
import { phCapture } from '../../utils';
import { BentoFeaturesStack } from './BentoFeaturesStack';
import { ComparisonSection } from './ComparisonSection';
import { CountriesMarquee } from './CountriesMarquee';
import { FAQSection } from './FAQSection';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { InfoSection } from './InfoSection';
import { PartnershipSection } from './PartnershipSection';
import { PlatformsSection } from './PlatformsSection';
import { TrialPeriodBanner } from './TrialPeriodBanner';
import { TrustSection } from './TrustSection';

export default function LandingPage() {
  useEffect(() => {
    phCapture('landing_viewed');
  }, []);

  return (
    <div className='relative bg-[#1a1a1a]'>
      <div className='sticky top-0 z-10 bg-[#1a1a1a] overflow-hidden pt-42 pb-32 md:py-56 lg:py-72'>
        <div className='inset-0 pointer-events-none opacity-40 overflow-hidden'>
          <div
            className='absolute inset-0 blur-3xl'
            style={{
              backgroundImage:
                'radial-gradient(60% 60% at 20% 15%, #ffb900 0%, transparent 90%),' +
                'radial-gradient(60% 60% at 80% 10%, #8e51ff 0%, transparent 90%),' +
                'radial-gradient(60% 60% at 50% 55%, #E57575 0%, transparent 90%)',
            }}
          />
        </div>
        <Container maxWidth={'md'}>
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
          <Reveal>
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
