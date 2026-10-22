import { Chip } from '@heroui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import locationsIconUrl from '../../../assets/icons/all-devices-icon.svg?url';
import serversIconUrl from '../../../assets/icons/servers-icon.svg?url';
import usersIconUrl from '../../../assets/icons/users-icon.svg?url';
import { ContentCard } from '../../../components/common/ContentCard';
import { Grid, GridItem, Heading, svgImage } from '../../../ui';

const LocationsIcon = svgImage({
  src: locationsIconUrl,
  width: 485,
  height: 480,
  className: 'w-auto max-w-[16rem] h-40 text-gray-800 dark:text-white',
});

const ServersIcon = svgImage({
  src: serversIconUrl,
  width: 604,
  height: 533,
  className: 'w-auto max-w-[16rem] w-full h-full text-gray-800 dark:text-white',
});

const UsersIcon = svgImage({
  src: usersIconUrl,
  width: 783,
  height: 554,
  className: 'w-auto max-w-[16rem] w-full h-full text-gray-800 dark:text-white',
});

type StatKey = 'users' | 'countries' | 'servers';

const STATS: Array<{ key: StatKey; metric: string; icon: ReactNode }> = [
  {
    key: 'users',
    metric: '20,000+',
    icon: <UsersIcon className={'w-60'} />,
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
        <Heading as='h2'>{t('landing.trust.title')}</Heading>
      </div>

      <Grid>
        {STATS.map(({ key, metric, icon }, index) => (
          <GridItem key={key} size={{ base: 12, sm: index === STATS.length - 1 ? 12 : 6 }}>
            <ContentCard
              variant='stat'
              title={metric}
              className={'flex-row flex-wrap'}
              description={t(`landing.trust.${key}`)}
              icon={icon}
            />
          </GridItem>
        ))}
      </Grid>
    </section>
  );
}
