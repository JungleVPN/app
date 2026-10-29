import { useEffect } from 'react';
import { TrackedSection } from '../../../components/marketing/SectionTracking/SectionTracking';
import { useDocumentClass } from '../../../hooks';
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
  useDocumentClass('landing-dark');

  useEffect(() => {
    phCapture('landing_viewed');
  }, []);

  return (
    <div className='relative'>
      <div className='relative md:sticky top-0 z-10 bg-[#0b0b0b] overflow-hidden pt-32 pb-24 md:py-56 lg:pt-56 lg:pb-20'>
        <div className='inset-0 pointer-events-none opacity-40 overflow-hidden'>
          <div
            className='absolute inset-0 blur-3xl z-0'
            style={{
              backgroundImage:
                'radial-gradient(40% 60% at 100% 30%, rgba(142, 81, 255, 0.9) 0%, rgba(142, 81, 255, 0.35) 40%, transparent 75%),' +
                'radial-gradient(40% 60% at 0% 55%, rgba(229, 117, 117, 0.9) 0%, rgba(229, 117, 117, 0.35) 40%, transparent 75%)',
            }}
          />
        </div>
        <Container>
          <TrackedSection section='hero'>
            <HeroSection />
          </TrackedSection>
        </Container>
      </div>
      <RoundedSection className='z-20' rounded>
        <TrackedSection section='trust'>
          <Container>
            <TrustSection />
          </Container>
        </TrackedSection>
        <TrackedSection section='countries'>
          <Reveal>
            <CountriesMarquee />
          </Reveal>
        </TrackedSection>
        <TrackedSection section='platforms'>
          <Container>
            <Reveal>
              <PlatformsSection />
            </Reveal>
          </Container>
        </TrackedSection>
        <TrackedSection section='bento_features'>
          <Container>
            <Reveal amount={0.1}>
              <BentoFeaturesStack />
            </Reveal>
          </Container>
        </TrackedSection>
      </RoundedSection>

      <div className='relative z-10'>
        <RoundedSection rounded variant={'secondary'} className={'-mt-40 md:-mt-40'}>
          <TrackedSection section='how_it_works'>
            <Container id='how-it-works' className={'pt-60'}>
              <Reveal>
                <HowItWorksSection />
              </Reveal>
            </Container>
          </TrackedSection>
          <TrackedSection section='pricing'>
            <Container className='p-20 bg-background rounded-4xl'>
              <PricingSection animateOnMount />
            </Container>
          </TrackedSection>
          <TrackedSection section='comparison'>
            <Container>
              <Reveal>
                <ComparisonSection />
              </Reveal>
            </Container>
          </TrackedSection>
          <TrackedSection section='trial_banner'>
            <Container id='pricing'>
              <Reveal>
                <TrialPeriodBanner />
              </Reveal>
            </Container>
          </TrackedSection>
          <TrackedSection section='info'>
            <Container>
              <Reveal>
                <InfoSection />
              </Reveal>
            </Container>
          </TrackedSection>
          <TrackedSection section='partnership'>
            <Container id='partnership'>
              <Reveal>
                <PartnershipSection />
              </Reveal>
            </Container>
          </TrackedSection>
          <TrackedSection section='faq'>
            <Container id='faq'>
              <Reveal>
                <FAQSection />
              </Reveal>
            </Container>
          </TrackedSection>
          <TrackedSection section='trial_banner_bottom'>
            <Container>
              <Reveal>
                <TrialPeriodBanner />
              </Reveal>
            </Container>
          </TrackedSection>
        </RoundedSection>
      </div>
    </div>
  );
}
