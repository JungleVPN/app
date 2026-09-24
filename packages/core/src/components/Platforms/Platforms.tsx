import { IconBrandAppleFilled, IconBrandWindowsFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import IconAndroid from '../../assets/icons/android-icon.svg?react';
import IconAndroidTv from '../../assets/icons/androidTv-icon.svg?react';
import IconAppleTv from '../../assets/icons/appleTv-icon.svg?react';
import IconMacOS from '../../assets/icons/macOs-icon.svg?react';

const PLATFORMS = [
  { key: 'ios', icon: <IconBrandAppleFilled size={32} /> },
  { key: 'android', icon: <IconAndroid /> },
  { key: 'macos', icon: <IconMacOS /> },
  { key: 'windows', icon: <IconBrandWindowsFilled size={32} /> },
  { key: 'appleTv', icon: <IconAppleTv /> },
  { key: 'androidTv', icon: <IconAndroidTv /> },
] as const;

interface PlatformsProps {
  className?: string;
}

export const Platforms = (props: PlatformsProps) => {
  const { className } = props;
  const { t } = useTranslation();

  return (
    <div
      className={`flex flex-wrap items-center gap-4 justify-around ${className ? className : ''}`}
    >
      {PLATFORMS.map(({ key, icon }) => (
        <div
          key={key}
          className='w-24 sm:w-18 md:w-28 flex flex-col items-center justify-between gap-3 rounded-2xl transition-all duration-200 hover:scale-105 hover:-translate-y-1'
        >
          <span>{icon}</span>
          <p className='text-base lg:text-md'>{t(`landing.info.devices.${key}`)}</p>
        </div>
      ))}
    </div>
  );
};
