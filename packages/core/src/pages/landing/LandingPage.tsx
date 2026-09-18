import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FooterSection, StickyFooterReveal } from '../../components';
import { useAuthStore } from '../../stores';
import { Container } from '../../ui';
import { PRICING_PATH, phCapture } from '../../utils';
import { BentoFeaturesStack } from './BentoFeaturesStack';
import { ComparisonSection } from './ComparisonSection';
import { CountriesMarquee } from './CountriesMarquee';
import { CTASection } from './CTASection';
import { FAQSection } from './FAQSection';
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
  const navigate = useNavigate();

  useEffect(() => {
    phCapture('landing_viewed', { userId: rmnUser?.id });
  }, [rmnUser]);

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
      <div
        className={
          'flex flex-col gap-48 relative z-20 bg-background rounded-t-[4rem] rounded-b-[4rem] py-12 md:py-8'
        }
      >
        <Container>
          <TrustSection />
        </Container>
        <CountriesMarquee />
        <Container>
          <PlatformsSection />
        </Container>
        <Container>
          <BentoFeaturesStack />
        </Container>
      </div>

      <div className='relative z-10'>
        <div
          className={
            'flex flex-col gap-56 relative z-10 bg-white -mt-24 pt-64 pb-32 rounded-b-[4rem] overflow-hidden'
          }
        >
          <Container id='how-it-works'>
            <HowItWorksSection />
          </Container>
          <Container>
            <ComparisonSection />
          </Container>
          <div className={'lg:px-12'}>
            <div
              className={
                'flex flex-col gap-48 relative z-10 bg-background rounded-t-[4rem] rounded-b-[4rem] py-12 md:py-8'
              }
            >
              <Container id='pricing'>
                <PricingSection />
              </Container>
            </div>
          </div>
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
            <CTASection onCtaClick={() => navigate(PRICING_PATH)} />
          </Container>
        </div>

        <StickyFooterReveal>
          <Container className={'-mt-20 pt-20'}>
            <FooterSection />
          </Container>
        </StickyFooterReveal>
      </div>
    </div>
  );
}
