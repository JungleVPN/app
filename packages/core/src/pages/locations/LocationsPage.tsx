import { Container, RoundedSection } from '../../ui';
import { CTASection } from '../landing/CTASection';
import { FAQSection } from '../landing/FAQSection';
import { AroundTheWorldSection } from './AroundTheWorldSection';
import { HeroSection } from './HeroSection';

export default function LocationsPage() {
  return (
    <div className='relative bg-[#1a1a1a]'>
      <HeroSection />

      <RoundedSection variant='secondary' className='py-20 md:py-28'>
        <AroundTheWorldSection />
        <Container>
          <CTASection />
        </Container>
        <Container>
          <FAQSection variant={'secondary'} />
        </Container>
      </RoundedSection>
    </div>
  );
}
