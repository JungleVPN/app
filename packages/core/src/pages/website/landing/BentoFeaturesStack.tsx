import { BentoSection } from './BentoSection';
import { FeaturesSection } from './FeaturesSection';

/**
 * Stacked scroll: BentoSection pins to the top of the viewport while
 * FeaturesSection scrolls up over it, coming to rest just under the Bento
 * title. Both then leave the viewport together when the stack ends.
 */
export function BentoFeaturesStack() {
  return (
    <>
      <div className='rounded-3xl'>
        <BentoSection />
      </div>

      <div className='mt-8'>
        <FeaturesSection />
      </div>
    </>
  );
}
