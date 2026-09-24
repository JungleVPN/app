import { useTranslation } from 'react-i18next';
import { coreEnv } from '../../env';

function mapboxStaticMapUrl(latitude: number, longitude: number): string | undefined {
  if (!coreEnv.mapboxAccessToken) return undefined;

  const point = `${longitude.toFixed(4)},${latitude.toFixed(4)}`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+c7a8ff(${point})/${point},9,0/800x800.webp?attribution=true&logo=true&access_token=${coreEnv.mapboxAccessToken}`;
}

export const StaticLocationMap = ({
  latitude,
  longitude,
  location,
}: {
  latitude: number;
  longitude: number;
  location: string;
}) => {
  const { t } = useTranslation();
  const mapUrl = mapboxStaticMapUrl(latitude, longitude);
  return (
    <figure className='flex h-full flex-col overflow-hidden rounded-4xl border bg-white p-2 sm:p-3'>
      <div className='relative h-full aspect-[2.17/1] overflow-hidden rounded-3xl bg-[#edf3ff] lg:min-h-0 lg:flex-1 lg:aspect-auto'>
        {mapUrl ? (
          <img
            src={mapUrl}
            alt={t('myIp.mapAlt', { location })}
            className='size-full object-cover'
            loading='lazy'
          />
        ) : null}
        <span className='absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow-sm'>
          {location}
        </span>
      </div>
      <figcaption className='px-3 pb-1 pt-3 text-sm text-[#707887]'>
        {t('myIp.approximateLocation')}
      </figcaption>
    </figure>
  );
};
