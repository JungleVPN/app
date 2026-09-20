import { useEffect } from 'react';
import { Container, Reveal, RoundedSection } from '../../ui';
import { phCapture } from '../../utils';
import { CTASection } from '../landing/CTASection';
import { FAQSection } from '../landing/FAQSection';
import { WhatIsVPN } from '../landing/WhatIsVPN';
import { HeroSection } from './HeroSection';
import { HowVpnWorksSection } from './HowVpnWorksSection';
import { MythsSection } from './MythsSection';
import { UseCasesSection } from './UseCasesSection';

const SECTIONS = [
  { key: 'concepts', content: <WhatIsVPN /> },
  { key: 'how', content: <HowVpnWorksSection /> },
  { key: 'useCases', content: <UseCasesSection /> },
  { key: 'myths', content: <MythsSection /> },
  { key: 'faq', content: <FAQSection variant='secondary' /> },
  { key: 'cta', content: <CTASection /> },
] as const;

export default function WhatIsVpnPage() {
  useEffect(() => {
    phCapture('what_is_vpn_viewed');
  }, []);

  return (
    <div className='relative bg-[#1a1a1a]'>
      <HeroSection />

      <RoundedSection rounded className='z-20'>
        <div className='flex flex-col gap-24 md:gap-32'>
          {SECTIONS.map(({ key, content }) => (
            <Container key={key}>
              <Reveal>{content}</Reveal>
            </Container>
          ))}
        </div>
      </RoundedSection>
    </div>
  );
}
