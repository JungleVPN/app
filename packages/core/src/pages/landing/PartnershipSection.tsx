import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

type PartnershipCardProps = {
  title: string;
  description: string;
  learnMoreLabel: string;
  learnMoreHref?: string;
};

function PartnershipCard({
  title,
  description,
  learnMoreLabel,
  learnMoreHref = '#',
}: PartnershipCardProps) {
  return (
    <Card
      variant='secondary'
      className='flex flex-col justify-between p-8 shadow-surface shadow-md'
    >
      <div>
        <h3 className='mb-4 text-xl font-bold'>{title}</h3>
        <p className='text-muted text-sm leading-relaxed'>{description}</p>
      </div>
      <Link to={learnMoreHref ?? '#'} className='mt-10 text-sm font-medium  underline'>
        {learnMoreLabel}
      </Link>
    </Card>
  );
}

const PARTNERSHIP_KEYS = ['affiliate', 'referral'] as const;

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

      <div className='grid grid-cols-2 gap-6 md:grid-cols-2'>
        {PARTNERSHIP_KEYS.map((key) => (
          <PartnershipCard
            key={key}
            title={t(`landing.partnership.${key}.title`)}
            description={t(`landing.partnership.${key}.description`)}
            learnMoreLabel={t('landing.partnership.learnMore')}
            learnMoreHref={key === 'affiliate' ? '/affiliates' : '/profile/referrals'}
          />
        ))}
      </div>
    </section>
  );
}
