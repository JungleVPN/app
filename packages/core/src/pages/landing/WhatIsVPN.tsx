import { IconEyeOff, IconKey, IconNetwork } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Grid, GridItem } from '../../ui';
import { Heading } from '../../ui/Heading';
import { Paragraph } from '../../ui/Paragraph';

const CONCEPT_CARDS = [
  {
    key: 'encryption',
    icon: <IconKey size={32} />,
    color: 'text-sky-500',
    bg: 'bg-sky-100',
    accent: 'bg-sky-200/60',
  },
  {
    key: 'masking',
    icon: <IconEyeOff size={32} />,
    color: 'text-violet-500',
    bg: 'bg-violet-100',
    accent: 'bg-violet-200/60',
  },
  {
    key: 'tunnel',
    icon: <IconNetwork size={32} />,
    color: 'text-amber-500',
    bg: 'bg-amber-100',
    accent: 'bg-amber-200/60',
  },
] as const;

export const WhatIsVPN = () => {
  const { t } = useTranslation();

  return (
    <>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <Heading as='h2'>{t('landing.info.what.title')}</Heading>
        <Paragraph>{t('landing.info.what.subtitle')}</Paragraph>
      </div>

      <Grid>
        {CONCEPT_CARDS.map(({ key, icon, color, bg, accent }) => (
          <GridItem key={key} size={{ base: 12, sm: 6, lg: 4 }}>
            <div
              className={`relative flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1.5 ${bg}`}
            >
              <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${accent}`} />
              <span className={`relative ${color}`}>{icon}</span>
              <div className='relative'>
                <Heading as='h3'>{t(`landing.info.what.${key}.title`)}</Heading>
                <Paragraph>{t(`landing.info.what.${key}.description`)}</Paragraph>
              </div>
            </div>
          </GridItem>
        ))}
      </Grid>
    </>
  );
};
