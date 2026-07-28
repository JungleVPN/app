import {
  IconCircleCheck,
  IconCurrencyDollar,
  IconDeviceMobile,
  IconHeartHandshake,
  IconInfinity,
  IconLock,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { FeatureCard } from '../../components/FeatureCard';
import { coreEnv } from '../../env';

const FEATURE_ICONS = [
  <IconCircleCheck size={36} stroke={1.5} />,
  <IconCurrencyDollar size={36} stroke={1.5} />,
  <IconLock size={36} stroke={1.5} />,
  <IconInfinity size={36} stroke={1.5} />,
  <IconDeviceMobile size={36} stroke={1.5} />,
  <IconHeartHandshake size={36} stroke={1.5} />,
];

const FEATURE_KEYS = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6'] as const;

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section className='mx-auto w-full px-6 py-48 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.features.title')}
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.features.subtitle')}</p>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {FEATURE_KEYS.map((key, index) => (
          <FeatureCard
            key={key}
            icon={FEATURE_ICONS[index]}
            title={t(`landing.features.${key}.title`)}
            description={t(`landing.features.${key}.description`, {deviceLimit: coreEnv.deviceLimit})}
          />
        ))}
      </div>
    </section>
  );
}
