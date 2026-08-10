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
    <div className='px-4 md:px-8 lg:px-24 xl:px-72'>
      <HeroSection />

      <TrustSection />
      <CountriesMarquee />

      <HowItWorksSection />

      <FeaturesSection />

      <BentoSection />

      <div className='py-24 md:py-48'>
        <WorldMap />
        <Stats />
      </div>

      <ComparisonSection />

      <div id='pricing'>
        <PricingSection />
      </div>

      <TestimonialsSection />

      <FAQSection />

      <div id='partnership'>
        <PartnershipSection />
      </div>

      <InfoSection />

      <div className='mb-24'>
        <FreeTrialSection />
      </div>

      <FooterSection />
    </div>
  );
}
