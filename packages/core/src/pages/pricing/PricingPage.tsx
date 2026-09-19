import { Container, RoundedSection } from '../../ui';
import { scrollToTop } from '../../utils';
import { CTASection } from '../landing/CTASection';
import { FAQSection } from '../landing/FAQSection';
import { PricingSection } from '../landing/PricingSection';
import { BenefitsSection } from './BenefitsSection';

export default function PricingPage() {
  return (
    <div className='relative bg-[#1a1a1a]'>
      <div className='relative lg:sticky top-0 z-10 bg-gray-100 overflow-hidden pt-30 px-5 pb-10 md:py-56 lg:py-30 md:px-20 lg:px-40'>
        <Container>
          <PricingSection surface='light' animateOnMount />
        </Container>
      </div>

      <RoundedSection variant={'secondary'}>
        <Container className={'flex flex-col gap-32 pt-20'}>
          <BenefitsSection />
          <CTASection onCtaClick={scrollToTop} />
          <FAQSection />
        </Container>
      </RoundedSection>
    </div>
  );
}
