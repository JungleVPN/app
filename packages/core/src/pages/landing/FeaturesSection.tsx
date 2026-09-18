import { useTranslation } from 'react-i18next';
import IconDevices from '../../assets/icons/devices-icon.svg?react';
import IconSupport from '../../assets/icons/human-support.svg?react';
import IconMoneyBack from '../../assets/icons/money-back.svg?react';
import IconReady from '../../assets/icons/ready-icon.svg?react';
import { coreEnv } from '../../env';

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
          <h2 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
            {t('landing.features.titleStart')}{' '}
            <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
              {t('landing.features.titleBrand')}
            </span>
          </h2>
          <p className='text-muted mt-3 text-base lg:text-md'>{t('landing.features.subtitle')}</p>
        </div>

        <div className='grid grid-cols-1 border-t border-divider sm:grid-cols-2'>
          {FEATURES.map(({ key, Icon }) => (
            <div
              key={key}
              className='flex flex-col gap-4 border-b border-divider px-8 py-10 last:border-b-0 sm:px-12 sm:nth-last-[-n+2]:border-b-0 sm:odd:border-e sm:odd:border-divider'
            >
              <Icon className='h-25 lg:h-40 w-auto' aria-hidden='true' />
              <div className='flex flex-col gap-2'>
                <h3 className='text-lg font-bold text-foreground sm:text-xl'>
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className='text-muted text-sm leading-relaxed sm:text-base'>
                  {t(`landing.features.${key}.description`, { deviceLimit: coreEnv.deviceLimit })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
