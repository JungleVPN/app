import { useTranslation } from 'react-i18next';
import feature_1 from '../../assets/lottie/feature_1.lottie?url';
import feature_2 from '../../assets/lottie/feature_2.lottie?url';
import feature_3 from '../../assets/lottie/feature_3.lottie?url';
import feature_4 from '../../assets/lottie/feature_4.lottie?url';
import feature_5 from '../../assets/lottie/feature_5.lottie?url';
import feature_6 from '../../assets/lottie/feature_6.lottie?url';
import { FeatureCard } from '../../components/FeatureCard';
import { coreEnv } from '../../env';
import { LottieIcon } from '../../ui';

const FEATURE_ICONS = [
  <LottieIcon key={1} loop src={feature_1} />,
  <LottieIcon key={2} loop src={feature_2} />,
  <LottieIcon key={3} loop src={feature_3} />,
  <LottieIcon key={4} loop src={feature_4} />,
  <LottieIcon key={5} loop src={feature_5} />,
  <LottieIcon key={6} loop src={feature_6} />,
];

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
            icon={FEATURE_ICONS[index]}
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
