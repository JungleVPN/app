import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AllDevicesIcon from '../../assets/icons/all-devices-icon.svg?react';
import PrivacyFirstIcon from '../../assets/icons/privacy-first-icon.svg?react';
import SecureByDesignIcon from '../../assets/icons/secure-by-design-icon.svg?react';
import UnlimitedTrafficIcon from '../../assets/icons/unlimited-traffic-icon.svg?react';

type BentoCellProps = {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
};

function BentoCell({ icon, title, description, className }: BentoCellProps) {
  return (
    <div
      className={`flex flex-col justify-between gap-4 p-5 sm:gap-5 sm:p-7 lg:gap-10 ${className ?? ''}`}
    >
      <div
        aria-hidden
        className='[&>svg]:h-auto [&>svg]:w-full [&>svg]:max-h-30 sm:[&>svg]:max-h-28 lg:[&>svg]:max-h-none flex h-full items-center justify-center'
      >
        {icon}
      </div>
      <div>
        <h3 className='text-base font-bold text-white'>{title}</h3>
        <p className='mt-1.5 text-xs leading-relaxed text-slate-400'>{description}</p>
      </div>
    </div>
  );
}

export function BentoSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className='mb-8 flex flex-col gap-1'>
        <h2 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
          {t('landing.bento.titleStart')}{' '}
          <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
            {t('landing.bento.titleBrand')}
          </span>
        </h2>
      </div>

      <div className='overflow-hidden rounded-3xl bg-[#1d1d1d]'>
        <div className='p-5 sm:p-7'>
          <h3 className='text-xl font-bold text-white'>{t('landing.bento.subtitle')}</h3>
        </div>

        <div className='grid grid-cols-1 border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3'>
          <BentoCell
            icon={<AllDevicesIcon />}
            title={t('landing.bento.smartRouting.title')}
            description={t('landing.bento.smartRouting.description')}
            className='min-h-10 lg:row-span-2 lg:border-r lg:border-white/10'
          />

          <div className='flex flex-col border-t border-white/10 sm:border-t-0 sm:border-l lg:border-l-0 lg:border-r'>
            <BentoCell
              icon={<SecureByDesignIcon />}
              title={t('landing.bento.security.title')}
              description={t('landing.bento.security.description')}
              className='min-h-10 flex-1'
            />
            <BentoCell
              icon={<UnlimitedTrafficIcon />}
              title={t('landing.bento.speed.title')}
              description={t('landing.bento.speed.description')}
              className='min-h-10 flex-1 border-t border-white/10'
            />
          </div>

          <BentoCell
            icon={<PrivacyFirstIcon />}
            title={t('landing.bento.privacy.title')}
            description={t('landing.bento.privacy.description')}
            className='min-h-10 border-t border-white/10 sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:border-t-0'
          />
        </div>
      </div>
    </section>
  );
}
