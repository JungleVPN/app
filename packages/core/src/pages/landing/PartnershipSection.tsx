import { useTranslation } from 'react-i18next';
import { ContentCard } from '../../components/ContentCard';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { TgsSticker } from '../../ui';

const PARTNERSHIP_KEYS = ['affiliate', 'referral'] as const;

const PARTNERSHIP_STICKERS: Record<(typeof PARTNERSHIP_KEYS)[number], string | undefined> = {
  affiliate: getTelegramStickerUrl(coreEnv.affiliateStickerFileId),
  referral: getTelegramStickerUrl(coreEnv.referralsStickerFileId),
};

export function PartnershipSection() {
  const { t } = useTranslation();

  return (
    <section className='mx-auto w-full px-6 py-48 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl'>
          {t('landing.partnership.title')}
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.partnership.subtitle')}</p>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {PARTNERSHIP_KEYS.map((key) => (
          <ContentCard
            key={key}
            variant='stat'
            title={t(`landing.partnership.${key}.title`)}
            description={t(`landing.partnership.${key}.description`)}
            learnMoreLabel={t('landing.partnership.learnMore')}
            learnMoreHref={key === 'affiliate' ? '/affiliates' : '/profile/referrals'}
            icon={
              PARTNERSHIP_STICKERS[key] ? (
                <TgsSticker src={PARTNERSHIP_STICKERS[key]!} className='h-full w-full' />
              ) : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
