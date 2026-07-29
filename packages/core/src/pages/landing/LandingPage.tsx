import { CountriesMarquee } from './CountriesMarquee';
import { FAQSection } from './FAQSection';
import { FeaturesSection } from './FeaturesSection';
import { FooterSection } from './FooterSection';
import { HeroSection } from './HeroSection';
import { PartnershipSection } from './PartnershipSection';
import { PricingSection } from './PricingSection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <div className={'max-w-7xl mx-auto'}>
        <FeaturesSection />
      </div>
      <CountriesMarquee />
      <div className={'max-w-7xl mx-auto'}>
        <div id='pricing'>
          <PricingSection />
        </div>
        <div id='partnership'>
          <PartnershipSection />
        </div>
        <FAQSection />
      </div>
      <FooterSection />
    </>
  );
}
