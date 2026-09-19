import { FooterSection, StickyFooterReveal } from '../../components';
import { Container } from '../../ui';
import { HeroSection } from './HeroSection';

export default function ReferralsPage() {
  return (
    <div className='relative bg-[#1a1a1a]'>
      <div className='relative lg:sticky top-0 z-10 bg-gray-100 overflow-hidden pt-30 px-5 pb-32 md:py-56 lg:py-40 md:px-20 lg:px-40'>
        <HeroSection />
      </div>

      <div className='relative z-10'>
        <StickyFooterReveal>
          <Container className={'-mt-20 pt-20'}>
            <FooterSection />
          </Container>
        </StickyFooterReveal>
      </div>
    </div>
  );
}
