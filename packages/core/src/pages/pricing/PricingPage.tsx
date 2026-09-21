import { Container, Reveal, RoundedSection } from '../../ui';
import { scrollToTop } from '../../utils';
import { CTASection } from '../landing/CTASection';
import { FAQSection } from '../landing/FAQSection';
import { PricingSection } from '../landing/PricingSection';
import { BenefitsSection } from './BenefitsSection';

export default function PricingPage() {
  return (
    <div className='relative bg-[#1a1a1a]'>
      <div className='relative lg:sticky top-0 z-10 bg-gray-100 overflow-hidden pt-40 px-5 pb-10 md:py-56 lg:pt-60 lg:pb-20 md:px-20 lg:px-40'>
        <PricingSection surface='light' animateOnMount />
      </div>

      <RoundedSection variant={'secondary'}>
        <Container className={'flex flex-col gap-32 pt-20'}>
          <Reveal>
            <BenefitsSection />
          </Reveal>
          <Reveal>
            <CTASection onCtaClick={scrollToTop} />
          </Reveal>
          <Reveal>
            <FAQSection />
          </Reveal>
        </Container>
      </RoundedSection>
    </div>
  );
}
