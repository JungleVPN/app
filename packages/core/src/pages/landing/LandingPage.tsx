import { FeaturesSection } from './FeaturesSection';
import { HeroSection } from './HeroSection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <div className={'max-w-7xl mx-auto'}>
        <FeaturesSection />
      </div>
    </>
  );
}
