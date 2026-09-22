import { useEffect } from 'react';
import { Container, Reveal, RoundedSection } from '../../ui';
import { phCapture } from '../../utils';
import { CTASection } from '../landing/CTASection';
import { FAQSection } from '../landing/FAQSection';
import { AroundTheWorldSection } from './AroundTheWorldSection';
import { HeroSection } from './HeroSection';

export default function LocationsPage() {
  useEffect(() => {
    phCapture('locations_page_viewed');
  }, []);

  return (
    <div className='relative bg-[#1a1a1a]'>
      <HeroSection />

      <RoundedSection variant='secondary' className='py-20 md:py-28'>
        <Reveal>
          <AroundTheWorldSection />
        </Reveal>
        <Container>
          <Reveal>
            <CTASection />
          </Reveal>
        </Container>
        <Container>
          <Reveal>
            <FAQSection variant={'secondary'} />
          </Reveal>
        </Container>
      </RoundedSection>
    </div>
  );
}
