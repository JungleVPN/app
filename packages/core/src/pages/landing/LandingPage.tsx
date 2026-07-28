import { FeaturesSection } from './FeaturesSection';
import { HeroSection } from './HeroSection';
import { PricingSection } from './PricingSection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <div className={'max-w-7xl mx-auto'}>
        <FeaturesSection />
        <PricingSection />
      </div>
    </>
  );
}
