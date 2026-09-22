import { useEffect } from 'react';
import { Container, Reveal, RoundedSection } from '../../ui';
import { phCapture } from '../../utils';
import { FAQSection } from '../landing/FAQSection';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { InviteBannerSection } from './InviteBannerSection';

export default function ReferralsPage() {
  useEffect(() => {
    phCapture('referrals_page_viewed');
  }, []);

  return (
    <div className='relative '>
      <div className='relative lg:sticky top-0 z-10 bg-gray-100 overflow-hidden pt-30 px-5 pb-10 md:py-56 lg:py-30 md:px-20 lg:px-40'>
        <HeroSection />
      </div>

      <RoundedSection variant={'secondary'}>
        <Container>
          <Reveal>
            <HowItWorksSection />
          </Reveal>
        </Container>
        <Container>
          <Reveal>
            <InviteBannerSection />
          </Reveal>
        </Container>
        <Container>
          <Reveal>
            <FAQSection />
          </Reveal>
        </Container>
      </RoundedSection>
    </div>
  );
}
