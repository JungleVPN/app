import { Chip } from '@heroui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LocationsIcon from '../../assets/icons/all-devices-icon.svg?react';
import ServersIcon from '../../assets/icons/servers-icon.svg?react';
import UsersIcon from '../../assets/icons/users-icon.svg?react';
import { ContentCard } from '../../components/ContentCard';
import { Grid, GridItem } from '../../ui';

type StatKey = 'users' | 'countries' | 'servers';

const STATS: Array<{ key: StatKey; metric: string; icon: ReactNode }> = [
  {
    key: 'users',
    metric: '20,000+',
    icon: <UsersIcon />,
  },
  {
    key: 'countries',
    metric: '6+',
    icon: <LocationsIcon />,
  },
  {
    key: 'servers',
    metric: '30+',
    icon: <ServersIcon />,
  },
];

export function TrustSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <Chip color='default' variant='secondary' className='w-fit'>
          <Chip.Label>{t('landing.trust.chip')}</Chip.Label>
        </Chip>
        <h2 className='text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl'>
          {t('landing.trust.title')}
        </h2>
      </div>

      <Grid>
        {STATS.map(({ key, metric, icon }, index) => (
          <GridItem key={key} size={{ base: 12, sm: index === STATS.length - 1 ? 12 : 6 }}>
            <ContentCard
              variant='stat'
              title={metric}
              description={t(`landing.trust.${key}`)}
              icon={icon}
            />
          </GridItem>
        ))}
      </Grid>
    </section>
  );
}
