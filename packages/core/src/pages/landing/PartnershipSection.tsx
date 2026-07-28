import { useTranslation } from 'react-i18next';

type PartnershipCardProps = {
  title: string;
  description: string;
  learnMoreLabel: string;
  learnMoreHref?: string;
};

function PartnershipCard({ title, description, learnMoreLabel, learnMoreHref = '#' }: PartnershipCardProps) {
  return (
    <div className='flex flex-col justify-between rounded-2xl bg-[#f0f4ff] p-8 dark:bg-muted/30'>
      <div>
        <h3 className='mb-4 text-xl font-bold text-foreground'>{title}</h3>
        <p className='text-muted text-sm leading-relaxed'>{description}</p>
      </div>
      <a href={learnMoreHref} className='mt-10 text-sm font-medium text-primary hover:underline'>
        {learnMoreLabel}
      </a>
    </div>
  );
}

const PARTNERSHIP_KEYS = ['affiliate', 'referral'] as const;

export function PartnershipSection() {
  const { t } = useTranslation();

  return (
    <section className='mx-auto w-full px-6 py-48 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.partnership.title')}
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.partnership.subtitle')}</p>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        {PARTNERSHIP_KEYS.map((key) => (
          <PartnershipCard
            key={key}
            title={t(`landing.partnership.${key}.title`)}
            description={t(`landing.partnership.${key}.description`)}
            learnMoreLabel={t('landing.partnership.learnMore')}
          />
        ))}
      </div>
    </section>
  );
}
