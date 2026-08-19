import { useTranslation } from 'react-i18next';
import affiliates from '../../assets/lottie/affiliate.lottie?url';
import referrals from '../../assets/lottie/referrals.lottie?url';
import { ContentCard } from '../../components/ContentCard';
import { Grid, GridItem, LottieIcon } from '../../ui';

const PARTNERSHIP_KEYS = ['affiliate', 'referral'] as const;

const PARTNERSHIP_STICKERS: Record<(typeof PARTNERSHIP_KEYS)[number], string | undefined> = {
  affiliate: affiliates,
  referral: referrals,
};

export function PartnershipSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-xl font-bold tracking-tight sm:text-3xl lg:text-4xl'>
          {t('landing.partnership.title')}
        </h2>
        <p className='text-muted text-base lg:text-md'>{t('landing.partnership.subtitle')}</p>
      </div>

      <Grid>
        {PARTNERSHIP_KEYS.map((key) => (
          <GridItem key={key} size={{ base: 12, sm: 6 }}>
            <ContentCard
              variant='stat'
              title={t(`landing.partnership.${key}.title`)}
              description={t(`landing.partnership.${key}.description`)}
              learnMoreLabel={t(`landing.partnership.${key}.cta`)}
              learnMoreHref={key === 'affiliate' ? '/affiliates' : '/profile/referrals'}
              icon={
                PARTNERSHIP_STICKERS[key] ? (
                  <LottieIcon
                    src={PARTNERSHIP_STICKERS[key]!}
                    size={130}
                    loop={true}
                    className='h-full w-full'
                  />
                ) : undefined
              }
            />
          </GridItem>
        ))}
      </Grid>
    </section>
  );
}
