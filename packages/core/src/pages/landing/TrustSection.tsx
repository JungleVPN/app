import { Chip } from '@heroui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import GlobeLottie from '../../assets/lottie/GlobeLottie.lottie?url';
import ServersLottie from '../../assets/lottie/Servers.lottie?url';
import UsersLottie from '../../assets/lottie/Users.lottie?url';
import { ContentCard } from '../../components/ContentCard';
import { LottieIcon } from '../../ui';

type StatKey = 'users' | 'countries' | 'servers';

const STATS: Array<{ key: StatKey; metric: string; icon: ReactNode }> = [
  {
    key: 'users',
    metric: '50,000+',
    icon: <LottieIcon src={UsersLottie} loop size={150} />,
  },
  {
    key: 'countries',
    metric: '6+',
    icon: <LottieIcon src={GlobeLottie} loop size={150} />,
  },
  {
    key: 'servers',
    metric: '30+',
    icon: <LottieIcon src={ServersLottie} loop size={200} />,
  },
];

export function TrustSection() {
  const { t } = useTranslation();

  return (
    <section className='mx-auto min-h-full w-full px-6 py-56 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <Chip color='default' variant='secondary' className='w-fit'>
          <Chip.Label>{t('landing.trust.chip')}</Chip.Label>
        </Chip>
        <h2 className='text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl'>
          {t('landing.trust.title')}
        </h2>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
        {STATS.map(({ key, metric, icon }, index) => (
          <ContentCard
            key={key}
            variant='stat'
            className={index === STATS.length - 1 ? 'sm:col-span-2' : ''}
            title={metric}
            description={t(`landing.trust.${key}`)}
            icon={icon}
          />
        ))}
      </div>
    </section>
  );
}
