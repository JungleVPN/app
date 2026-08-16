import { useTranslation } from 'react-i18next';
import globe from '../../assets/lottie/globe.lottie?url';
import globe_dark from '../../assets/lottie/globe_dark.lottie?url';
import money from '../../assets/lottie/money.lottie?url';
import money_dark from '../../assets/lottie/money_dark.lottie?url';
import ready from '../../assets/lottie/ready.lottie?url';
import ready_dark from '../../assets/lottie/ready_dark.lottie?url';
import support from '../../assets/lottie/support.lottie?url';
import support_dark from '../../assets/lottie/support_dark.lottie?url';
import { ContentCard } from '../../components/ContentCard';
import { coreEnv } from '../../env';
import { useTheme } from '../../hooks';
import { Grid, GridItem, LottieIcon } from '../../ui';

const DARK_ICONS = [ready_dark, money_dark, globe_dark, support_dark];
const LIGHT_ICONS = [ready, money, globe, support];

const FEATURE_KEYS = ['ready', 'money', 'globe', 'support'] as const;

export function FeaturesSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const icons = theme === 'dark' ? DARK_ICONS : LIGHT_ICONS;

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.features.titleStart')}{' '}
          <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
            {t('landing.features.titleBrand')}
          </span>
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.features.subtitle')}</p>
      </div>

      <Grid>
        {FEATURE_KEYS.map((key, index) => (
          <GridItem key={key} size={{ base: 12, sm: 6 }}>
            <ContentCard
              icon={icons[index] ? <LottieIcon loop src={icons[index]} /> : undefined}
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
