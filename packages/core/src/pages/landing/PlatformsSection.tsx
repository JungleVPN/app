import { Button } from '@heroui/react';
import { IconBrandAppleFilled, IconBrandWindowsFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import IconAndroid from '../../assets/icons/android-icon.svg?react';
import IconAndroidTv from '../../assets/icons/androidTv-icon.svg?react';
import IconAppleTv from '../../assets/icons/appleTv-icon.svg?react';
import IconMacOS from '../../assets/icons/macOs-icon.svg?react';
import GlobeLottie from '../../assets/lottie/globe.lottie?url';
import { useNavigation } from '../../hooks';
import { LottieIcon } from '../../ui';

const PLATFORMS = [
  { key: 'ios', icon: <IconBrandAppleFilled size={32} /> },
  { key: 'android', icon: <IconAndroid /> },
  { key: 'macos', icon: <IconMacOS /> },
  { key: 'windows', icon: <IconBrandWindowsFilled size={32} /> },
  { key: 'appleTv', icon: <IconAppleTv /> },
  { key: 'androidTv', icon: <IconAndroidTv /> },
] as const;

export function PlatformsSection() {
  const { t } = useTranslation();
  const navigate = useNavigation();

  return (
    <section
      className={'bg-white relative p-6 md:p-8 rounded-4xl border-gray-500 border border-solid'}
    >
      <div className='flex flex-col md:flex-row gap-12 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex flex-col items-center gap-4 text-center md:items-start lg:text-left'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground text-start lg:text-4xl'>
            {t('landing.info.devices.title')}
          </h2>
          <p className='max-w-md text-base text-muted text-start lg:text-md pr-6'>
            {t('landing.info.devices.subtitle')}
          </p>
          <Button
            size='lg'
            variant='primary'
            onClick={() => navigate('/profile/subscription')}
            className='h-14 min-w-full sm:min-w-xs w-fit px-8 rounded-4xl bg-linear-to-r from-violet-500 to-amber-400 text-white hover:opacity-90'
          >
            {t('landing.info.devices.cta')}
          </Button>
        </div>

        <div className='hidden sm:block flex h-64 w-full items-center justify-center rounded-3xl lg:h-80 lg:w-96 lg:shrink-0'>
          <LottieIcon src={GlobeLottie} loop size={250} />,
        </div>
      </div>

      <div className='mt-12 flex flex-wrap items-center gap-4 justify-around'>
        {PLATFORMS.map(({ key, icon }) => (
          <div
            key={key}
            className='w-18 md:w-28 flex flex-col items-center justify-between gap-3 rounded-2xl transition-all duration-200 hover:scale-105 hover:-translate-y-1'
          >
            <span>{icon}</span>
            <h3 className='text-sm font-semibold text-foreground text-center'>
              {t(`landing.info.devices.${key}`)}
            </h3>
          </div>
        ))}
      </div>
    </section>
  );
}
