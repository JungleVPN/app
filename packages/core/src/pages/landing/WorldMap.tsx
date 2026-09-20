import { useTranslation } from 'react-i18next';
import worldMapUrl from '../../assets/world-map-dotted.svg';

/**
 * The dotted server map. The SVG is generated ahead of time by
 * `scripts/generate-world-map.mjs` and served as a static file: building it in
 * the browser meant shipping ~350 KB of world geometry in the entry bundle and
 * blocking the main thread for most of a second on arrival.
 */
export function WorldMap() {
  const { t } = useTranslation();

  return (
    <img
      src={worldMapUrl}
      alt={t('landing.locations.hero.mapAlt')}
      width={198}
      height={100}
      decoding='async'
      className='h-auto w-full lg:w-[60%] m-auto opacity-90 mask-[linear-gradient(to_bottom,transparent,var(--background)_20%,var(--background)_80%,transparent)] select-none'
    />
  );
}
