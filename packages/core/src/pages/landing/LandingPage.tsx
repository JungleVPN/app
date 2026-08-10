import { BentoSection } from './BentoSection';
import { ComparisonSection } from './ComparisonSection';
import { CountriesMarquee } from './CountriesMarquee';
import { FAQSection } from './FAQSection';
import { FeaturesSection } from './FeaturesSection';
import { FooterSection } from './FooterSection';
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
    <>
      <HeroSection />
      <div className={'max-w-7xl mx-auto'}>
        <TrustSection />
      </div>
      <CountriesMarquee />
      <div className={'max-w-7xl mx-auto'}>
        <HowItWorksSection />
      </div>
      <div className={'max-w-7xl mx-auto'}>
        <FeaturesSection />
      </div>
      <div className={'max-w-7xl mx-auto'}>
        <BentoSection />
      </div>
      <div className={'pt-40'}>
        <WorldMap />
      </div>

      <div className={'mb-40'}>
        <Stats />
      </div>
      <ComparisonSection />

      <div className={'max-w-7xl mx-auto'}>
        <div id='pricing'>
          <PricingSection />
        </div>
        <TestimonialsSection />
        <FAQSection />
        <div id='partnership'>
          <PartnershipSection />
        </div>
        <div className={'max-w-7xl mx-auto'}>
          <InfoSection />
        </div>
      </div>
      <FooterSection />
    </>
  );
}
