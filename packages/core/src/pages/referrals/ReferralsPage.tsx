import { Container, RoundedSection } from '../../ui';
import { FAQSection } from '../landing/FAQSection';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { InviteBannerSection } from './InviteBannerSection';

export default function ReferralsPage() {
  return (
    <div className='relative '>
      <div className='relative lg:sticky top-0 z-10 bg-gray-100 overflow-hidden pt-30 px-5 pb-10 md:py-56 lg:py-40 md:px-20 lg:px-40'>
        <HeroSection />
      </div>

      <RoundedSection className='z-20' variant={'secondary'}>
        <Container>
          <HowItWorksSection />
        </Container>
        <Container>
          <InviteBannerSection />
        </Container>
        <Container>
          <FAQSection />
        </Container>
      </RoundedSection>
    </div>
  );
}
