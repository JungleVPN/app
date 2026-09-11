import { useEffect } from 'react';
import { FooterSection } from '../../components';
import { useAuthStore } from '../../stores';
import { Container } from '../../ui';
import { isGlobalOrigin, phCapture } from '../../utils';
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
import { PlatformsSection } from './PlatformsSection';
import { PricingSection } from './PricingSection';
import { TrustSection } from './TrustSection';
import { WhatIsVPN } from './WhatIsVPN';

export default function LandingPage() {
  const { rmnUser } = useAuthStore();
  const isRu = !isGlobalOrigin();

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
      <div
        className={
          'flex flex-col gap-48 relative z-10 bg-background rounded-t-[4rem] rounded-b-[4rem] py-12 md:py-8'
        }
      >
        <div className='absolute inset-0 pointer-events-none opacity-40 overflow-hidden'>
          <div
            className='absolute inset-0 blur-3xl'
            style={{
              background:
                'linear-gradient(135deg,rgba(255, 255, 255, 0.1) 30%, rgba(142, 81, 255, 0.1) 30%), rgba(255, 255, 255, 0.1) 30%',
            }}
          />
        </div>
        <Container>
          <TrustSection />
        </Container>
        <CountriesMarquee />
        <Container>
          <PlatformsSection />
        </Container>
        <Container>
          <BentoSection />
        </Container>
        <Container>
          <FeaturesSection />
        </Container>
      </div>
      <div className={'flex flex-col gap-56 relative bg-background -mt-24 pt-64 overflow-hidden'}>
        <Container id='how-it-works'>
          <HowItWorksSection />
        </Container>
        <Container>
          <ComparisonSection />
        </Container>
        <Container id='pricing'>
          <PricingSection />
        </Container>
        {isRu && (
          <Container>
            <FreeTrialSection />
          </Container>
        )}
        <Container>
          <InfoSection />
        </Container>
        <Container id='partnership'>
          <PartnershipSection />
        </Container>
        <Container id='faq'>
          <FAQSection />
        </Container>
        <Container id='faq'>
          <WhatIsVPN />
        </Container>
        <Container>
          <FooterSection />
        </Container>
      </div>
    </div>
  );
}
