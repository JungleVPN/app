import { useTranslation } from 'react-i18next';
import globe from '../../assets/lottie/globe.lottie?url';
import money from '../../assets/lottie/money.lottie?url';
import ready from '../../assets/lottie/ready.lottie?url';
import support from '../../assets/lottie/support.lottie?url';
import { ContentCard } from '../../components/ContentCard';
import { coreEnv } from '../../env';
import { Grid, GridItem, LottieIcon } from '../../ui';

const ICONS = [ready, globe, support, money];

const FEATURE_KEYS = ['ready', 'globe', 'support', 'money'] as const;

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
          {t('landing.features.titleStart')}{' '}
          <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
            {t('landing.features.titleBrand')}
          </span>
        </h2>
        <p className='text-muted text-base lg:text-md'>{t('landing.features.subtitle')}</p>
      </div>

      <Grid>
        {FEATURE_KEYS.map((key, index) => (
          <GridItem key={key} size={{ base: 12, sm: 6 }}>
            <ContentCard
              icon={ICONS[index] ? <LottieIcon loop src={ICONS[index]} /> : undefined}
              title={t(`landing.features.${key}.title`)}
              description={t(`landing.features.${key}.description`, {
                deviceLimit: coreEnv.deviceLimit,
              })}
            />
          </GridItem>
        ))}
      </Grid>
    </section>
  );
}
