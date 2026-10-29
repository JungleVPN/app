import { useTranslation } from 'react-i18next';
import allDevicesIconUrl from '../../../assets/icons/all-devices-icon.svg?url';
import privacyFirstIconUrl from '../../../assets/icons/privacy-first-icon.svg?url';
import secureByDesignIconUrl from '../../../assets/icons/secure-by-design-icon.svg?url';
import unlimitedTrafficIconUrl from '../../../assets/icons/unlimited-traffic-icon.svg?url';
import { Heading, Paragraph, svgImage } from '../../../ui';

const AllDevicesIcon = svgImage({
  src: allDevicesIconUrl,
  width: 485,
  height: 480,
  className: 'w-auto max-w-[16rem] h-40 text-gray-800 dark:text-white',
});

const PrivacyFirstIcon = svgImage({
  src: privacyFirstIconUrl,
  width: 524,
  height: 540,
  className: 'w-auto max-w-[16rem] h-40 text-gray-800 dark:text-white',
});

const SecureByDesignIcon = svgImage({
  src: secureByDesignIconUrl,
  width: 385,
  height: 482,
  className: 'w-auto max-w-[16rem] h-40 text-gray-800 dark:text-white',
});

const UnlimitedTrafficIcon = svgImage({
  src: unlimitedTrafficIconUrl,
  width: 556,
  height: 421,
  className: 'w-auto max-w-[16rem] h-40 text-gray-800 dark:text-white',
});

const CELLS = [
  { key: 'smartRouting', Icon: AllDevicesIcon },
  { key: 'security', Icon: SecureByDesignIcon },
  { key: 'speed', Icon: UnlimitedTrafficIcon },
  { key: 'privacy', Icon: PrivacyFirstIcon },
] as const;

export function BentoSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className='mb-8 flex flex-col gap-1'>
        <Heading as='h2'>
          {t('landing.bento.titleStart')}{' '}
          <span className='bg-violet-500 bg-clip-text text-transparent'>
            {t('landing.bento.titleBrand')}
          </span>
        </Heading>
      </div>

      <div className='overflow-hidden rounded-3xl bg-[#1d1d1d]'>
        <div className='px-8 py-10 sm:px-12'>
          <Heading as='h3' className='text-white'>
            {t('landing.bento.subtitle')}
          </Heading>
        </div>

        <div className='grid grid-cols-1 border-t border-white/10 sm:grid-cols-2'>
          {CELLS.map(({ key, Icon }) => (
            <div
              key={key}
              className='flex flex-col gap-4 border-b border-white/10 px-8 py-10 last:border-b-0 sm:px-12 sm:nth-last-[-n+2]:border-b-0 sm:odd:border-e sm:odd:border-white/10'
            >
              <Icon className='h-28 lg:h-40 w-fit m-auto' />
              <div className='flex flex-col gap-2'>
                <Heading as='h3' className='text-white'>
                  {t(`landing.bento.${key}.title`)}
                </Heading>
                <Paragraph className='text-muted'>
                  {t(`landing.bento.${key}.description`)}
                </Paragraph>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
