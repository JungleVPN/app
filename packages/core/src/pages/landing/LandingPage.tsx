import { BentoSection } from './BentoSection';
import { CountriesMarquee } from './CountriesMarquee';
import { FAQSection } from './FAQSection';
import { FeaturesSection } from './FeaturesSection';
import { FooterSection } from './FooterSection';
import { FreeTrialSection } from './FreeTrialSection';
import { HeroSection } from './HeroSection';
import { PartnershipSection } from './PartnershipSection';
import { HowItWorksSection } from './HowItWorksSection';
import { TrustSection } from './TrustSection';
// import { PricingSection } from './PricingSection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <div className={'max-w-7xl mx-auto'}>
        <TrustSection />
      </div>
      <div className={'max-w-7xl mx-auto'}>
        <HowItWorksSection />
      </div>
      <div className={'max-w-7xl mx-auto'}>
        <FeaturesSection />
      </div>
      <div className={'max-w-7xl mx-auto'}>
        <BentoSection />
      </div>
      <CountriesMarquee />
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
