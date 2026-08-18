import { Container } from '../../ui';
import { BentoSection } from './BentoSection';
import { ComparisonSection } from './ComparisonSection';
import { CountriesMarquee } from './CountriesMarquee';
import { FAQSection } from './FAQSection';
import { FeaturesSection } from './FeaturesSection';
import { FooterSection } from './FooterSection';
import { FreeTrialSection } from './FreeTrialSection';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { InfoSection } from './InfoSection';
import { PartnershipSection } from './PartnershipSection';
import { PricingSection } from './PricingSection';
import { TestimonialsSection } from './TestimonialsSection';
import { TrustSection } from './TrustSection';

export default function LandingPage() {
  return (
    <div className='relative bg-[#212024] '>
      <div
        className={
          'absolute top-0 left-0 w-screen h-screen pointer-events-none bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.035)_0,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_42px)] inset-0;'
        }
      />
      <Container className='sticky top-0 overflow-hidden mb-32'>
        <HeroSection />
      </Container>
      <div
        className={
          'flex flex-col gap-48 relative z-10 bg-background rounded-t-[4rem] py-16 md:py-8 overflow-hidden'
        }
      >
        <Container>
          <TrustSection />
        </Container>
        <CountriesMarquee />
        <Container>
          <HowItWorksSection />
        </Container>
        <Container>
          <FeaturesSection />
        </Container>
      </div>
      <div className={'flex flex-col gap-56 relative bg-background -mt-24 pt-64 overflow-hidden'}>
        <Container>
          <BentoSection />
        </Container>
        <Container>
          <ComparisonSection />
        </Container>
        <Container id='pricing'>
          <PricingSection />
        </Container>
        <TestimonialsSection />
        <Container>
          <FAQSection />
        </Container>
        <Container>
          <FreeTrialSection />
        </Container>
        <Container id='partnership'>
          <PartnershipSection />
        </Container>
        <Container>
          <InfoSection />
        </Container>
        <Container>
          <FreeTrialSection />
        </Container>
        <Container>
          <FooterSection />
        </Container>
      </div>
    </div>
  );
}
