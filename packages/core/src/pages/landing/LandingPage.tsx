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
import { Stats } from './Stats';
import { TestimonialsSection } from './TestimonialsSection';
import { TrustSection } from './TrustSection';
import { WorldMap } from './WorldMap';

export default function LandingPage() {
  return (
    <div className='flex flex-col gap-32'>
      <Container>
        <HeroSection />
      </Container>
      <Container>
        <TrustSection />
      </Container>
      <Container>
        <CountriesMarquee />
      </Container>
      <Container>
        <HowItWorksSection />
      </Container>
      <Container>
        <FeaturesSection />
      </Container>
      <Container>
        <BentoSection />
      </Container>
      <Container className='py-24 md:py-48'>
        <WorldMap />
        <Stats />
      </Container>
      <Container>
        <ComparisonSection />
      </Container>
      <Container id='pricing'>
        <PricingSection />
      </Container>
      <Container>
        <TestimonialsSection />
      </Container>
      <Container>
        <FAQSection />
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
