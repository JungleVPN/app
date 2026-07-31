import { useTranslation } from 'react-i18next';
import globe from '../../assets/lottie/globe.lottie?url';
import globe_dark from '../../assets/lottie/globe_dark.lottie?url';
import money from '../../assets/lottie/money.lottie?url';
import money_dark from '../../assets/lottie/money_dark.lottie?url';
import privacy from '../../assets/lottie/privacy.lottie?url';
import privacy_dark from '../../assets/lottie/privacy_dark.lottie?url';
import ready from '../../assets/lottie/ready.lottie?url';
import ready_dark from '../../assets/lottie/ready_dark.lottie?url';
import speed from '../../assets/lottie/speed.lottie?url';
import speed_dark from '../../assets/lottie/speed_dark.lottie?url';
import support from '../../assets/lottie/support.lottie?url';
import support_dark from '../../assets/lottie/support_dark.lottie?url';
import { FeatureCard } from '../../components/FeatureCard';
import { coreEnv } from '../../env';
import { useTheme } from '../../hooks';
import { LottieIcon } from '../../ui';

const DARK_ICONS = [globe_dark, speed_dark, privacy_dark, money_dark, ready_dark, support_dark];
const LIGHT_ICONS = [globe, speed, privacy, money, ready, support];

const FEATURE_KEYS = [
  'feature1',
  'feature2',
  'feature3',
  'feature4',
  'feature5',
  'feature6',
] as const;

export function FeaturesSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const icons = theme === 'dark' ? DARK_ICONS : LIGHT_ICONS;

  return (
    <section className='mx-auto w-full px-6 py-48 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.features.titleStart')}{' '}
          <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
            {t('landing.features.titleBrand')}
          </span>
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.features.subtitle')}</p>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {FEATURE_KEYS.map((key, index) => (
          <FeatureCard
            key={key}
            icon={icons[index] ? <LottieIcon key={key} loop src={icons[index]} /> : undefined}
            title={t(`landing.features.${key}.title`)}
            description={t(`landing.features.${key}.description`, {
              deviceLimit: coreEnv.deviceLimit,
            })}
          />
        ))}
      </div>
    </section>
  );
}
