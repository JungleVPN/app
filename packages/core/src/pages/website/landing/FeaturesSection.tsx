import { useTranslation } from 'react-i18next';
import iconDevicesUrl from '../../../assets/icons/devices-icon.svg?url';
import iconSupportUrl from '../../../assets/icons/human-support.svg?url';
import iconMoneyBackUrl from '../../../assets/icons/money-back.svg?url';
import iconReadyUrl from '../../../assets/icons/ready-icon.svg?url';
import { coreEnv } from '../../../env';
import { Heading } from '../../../ui';
import { Paragraph } from '../../../ui';
import { svgImage } from '../../../ui';

const IconDevices = svgImage({
  src: iconDevicesUrl,
  width: 749,
  height: 699,
  className: 'w-auto w-full h-full text-gray-800 dark:text-white',
});

const IconSupport = svgImage({
  src: iconSupportUrl,
  width: 420,
  height: 568,
  className: 'w-auto w-full h-full text-gray-800 dark:text-white',
});

const IconMoneyBack = svgImage({
  src: iconMoneyBackUrl,
  width: 763,
  height: 654,
  className: 'w-auto w-full h-full text-gray-800 dark:text-white',
});

const IconReady = svgImage({
  src: iconReadyUrl,
  width: 622,
  height: 546,
  className: 'w-auto w-full h-full text-gray-800 dark:text-white',
});

const FEATURES = [
  { key: 'ready', Icon: IconReady },
  { key: 'globe', Icon: IconDevices },
  { key: 'support', Icon: IconSupport },
  { key: 'money', Icon: IconMoneyBack },
] as const;

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className='overflow-hidden rounded-3xl bg-content2 shadow-surface bg-white'>
        <div className='px-8 py-10 sm:px-12'>
          <Heading as='h2'>
            {t('landing.features.titleStart')}{' '}
            <span className='bg-violet-500 bg-clip-text text-transparent'>
              {t('landing.features.titleBrand')}
            </span>
          </Heading>
          <Paragraph>{t('landing.features.subtitle')}</Paragraph>
        </div>

        <div className='grid grid-cols-1 border-t border-divider sm:grid-cols-2'>
          {FEATURES.map(({ key, Icon }) => (
            <div
              key={key}
              className='flex flex-col gap-4 border-b border-divider px-8 py-10 last:border-b-0 sm:px-12 sm:nth-last-[-n+2]:border-b-0 sm:odd:border-e sm:odd:border-divider'
            >
              <Icon className='h-28 lg:h-40 w-fit m-auto' aria-hidden='true' />
              <div className='flex flex-col gap-2'>
                <Heading as='h3'>{t(`landing.features.${key}.title`)}</Heading>
                <Paragraph className={'text-muted'}>
                  {t(`landing.features.${key}.description`, { deviceLimit: coreEnv.deviceLimit })}
                </Paragraph>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
