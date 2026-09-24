import { useEffect } from 'react';
import { Container, Reveal, RoundedSection } from '../../ui';
import { phCapture, scrollToTop } from '../../utils';
import { CTASection } from '../landing/CTASection';
import { FAQSection } from '../landing/FAQSection';
import { PricingSection } from '../landing/PricingSection';
import { BenefitsSection } from './BenefitsSection';

export default function PricingPage() {
  useEffect(() => {
    phCapture('pricing_page_viewed');
  }, []);

  return (
    <>
      <div className={'bg-gray-100 overflow-hidden'}>
        <Container className='pt-40 pb-10'>
          <PricingSection surface='light' animateOnMount />
        </Container>
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
    </>
  );
}
