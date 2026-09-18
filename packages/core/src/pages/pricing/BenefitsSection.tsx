import { useTranslation } from 'react-i18next';
import IconDevices from '../../assets/icons/device-small-icon.svg?react';
import IconServers from '../../assets/icons/high-speed-small-icon.svg?react';
import PriceBenefitsIcon from '../../assets/icons/price-benefits-icon.svg?react';
import IconReady from '../../assets/icons/ready-small-icon.svg?react';
import IconSupport from '../../assets/icons/support-small-icon.svg?react';

const BENEFITS = [
  {
    key: 'devices',
    Icon: IconDevices,
    titleKey: 'landing.info.devices.title',
    descriptionKey: 'landing.info.devices.subtitle',
  },
  {
    key: 'ready',
    Icon: IconReady,
    titleKey: 'landing.features.ready.title',
    descriptionKey: 'landing.features.ready.description',
  },
  {
    key: 'support',
    Icon: IconSupport,
    titleKey: 'landing.features.support.title',
    descriptionKey: 'landing.features.support.description',
  },
  { key: 'servers', Icon: IconServers, title: '20000+', descriptionKey: 'landing.trust.users' },
] as const;

export function BenefitsSection() {
  const { t } = useTranslation();

  return (
    <section className='grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16'>
      <div
        aria-hidden='true'
        className='aspect-square w-full h-80 lg:h-full rounded-4xl bg-surface-secondary border border-divider'
      >
        <PriceBenefitsIcon />
      </div>

      <div className='flex flex-col gap-8'>
        <div className='flex flex-col gap-3'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
            {t('landing.features.titleStart')}{' '}
            <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
              {t('landing.features.titleBrand')}
            </span>
          </h2>
          <p className='text-muted text-base lg:text-md'>{t('landing.features.subtitle')}</p>
        </div>

        <div className='grid grid-cols-1 gap-8 sm:grid-cols-2'>
          {BENEFITS.map((benefit) => (
            <div key={benefit.key} className='flex flex-col gap-3'>
              <benefit.Icon className='h-10 w-auto text-purple-400 mr-auto' aria-hidden='true' />
              <h3 className='text-lg font-bold text-foreground'>
                {'title' in benefit ? benefit.title : t(benefit.titleKey)}
              </h3>
              <p className='text-muted text-sm leading-relaxed'>{t(benefit.descriptionKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
