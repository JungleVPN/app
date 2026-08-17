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
    <div className='flex flex-col gap-48'>
      <Container>
        <HeroSection />
      </Container>
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
  );
}
