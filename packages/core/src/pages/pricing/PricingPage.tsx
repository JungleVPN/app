import { FooterSection, StickyFooterReveal } from '../../components';
import { Container } from '../../ui';
import { scrollToTop } from '../../utils';
import { CTASection } from '../landing/CTASection';
import { FAQSection } from '../landing/FAQSection';
import { PricingSection } from '../landing/PricingSection';
import { BenefitsSection } from './BenefitsSection';

export default function PricingPage() {
  return (
    <div className='relative bg-[#1a1a1a]'>
      <div className='relative lg:sticky top-0 z-10 bg-gray-100 overflow-hidden pt-30 pb-32 md:py-56 lg:py-40'>
        <Container>
          <PricingSection surface='light' animateOnMount />
        </Container>
      </div>

      <div className='relative z-10'>
        <div
          className={
            'flex flex-col gap-56 relative z-10 bg-white -mt-24 pt-24 pb-32 rounded-b-[4rem] overflow-hidden'
          }
        >
          <Container className={'flex flex-col gap-32'}>
            <BenefitsSection />
            <CTASection onCtaClick={scrollToTop} />
            <FAQSection />
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
