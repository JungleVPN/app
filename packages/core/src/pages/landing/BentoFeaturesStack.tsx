import { BentoSection } from './BentoSection';
import { FeaturesSection } from './FeaturesSection';

/**
 * Stacked scroll: BentoSection pins to the top of the viewport while
 * FeaturesSection scrolls up over it, coming to rest just under the Bento
 * title. Both then leave the viewport together when the stack ends.
 */
export function BentoFeaturesStack() {
  return (
    <div className='relative pb-[10vh] lg:pb-[30vh]'>
      <div className='relative lg:sticky top-0 lg:top-8 z-0 lg:max-h-none lg:overflow-visible rounded-3xl'>
        <BentoSection />
      </div>

      <div className='relative z-10 mt-8'>
        <FeaturesSection />
      </div>
    </div>
  );
}
