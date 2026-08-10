import { BentoSection } from './BentoSection';
import { CountriesMarquee } from './CountriesMarquee';
import { FAQSection } from './FAQSection';
import { FeaturesSection } from './FeaturesSection';
import { FooterSection } from './FooterSection';
import { FreeTrialSection } from './FreeTrialSection';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { PartnershipSection } from './PartnershipSection';
import { Stats } from './Stats';
import { TrustSection } from './TrustSection';
import { WorldMap } from './WorldMap';

// import { PricingSection } from './PricingSection';

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
      <div className={'max-w-7xl mx-auto'}>
        {/*<div id='pricing'>*/}
        {/*  <PricingSection />*/}
        {/*</div>*/}
        <FreeTrialSection />
        <div id='partnership'>
          <PartnershipSection />
        </div>
        <FAQSection />
      </div>
      <FooterSection />
    </>
  );
}
