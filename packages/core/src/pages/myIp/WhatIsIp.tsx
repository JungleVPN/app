import { Chip } from '@heroui/react';
import { motion, useReducedMotion } from 'framer-motion';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Grid } from '../../ui';
import { GridItem, Span } from '../../ui/Grid/GridItem';
import { Heading } from '../../ui/Heading';
import { Paragraph } from '../../ui/Paragraph';

const whatIsAnIpInfo = (
  t: TFunction,
): {
  id: string;
  label: string;
  paragraphs: string[];
  sm: Span | undefined;
  md: Span | undefined;
  lg: Span | undefined;
}[] => {
  return [
    {
      id: 'ip-address',
      label: t('myIp.aboutCards.ipAddress.label'),
      paragraphs: [t('myIp.aboutCards.ipAddress.paragraph1')],
      sm: 12,
      md: 6,
      lg: 4,
    },
    {
      id: 'public-ip-addresses',
      label: t('myIp.aboutCards.publicIpAddresses.label'),
      paragraphs: [t('myIp.aboutCards.publicIpAddresses.paragraph1')],
      sm: 12,
      md: 6,
      lg: 8,
    },
    {
      id: 'private-ip-addresses',
      label: t('myIp.aboutCards.privateIpAddresses.label'),
      paragraphs: [
        t('myIp.aboutCards.privateIpAddresses.paragraph1'),
        t('myIp.aboutCards.privateIpAddresses.paragraph2'),
        t('myIp.aboutCards.privateIpAddresses.paragraph3'),
      ],
      sm: 12,
      md: 6,
      lg: 5,
    },
    {
      id: 'browser',
      label: t('myIp.aboutCards.versions.label'),
      paragraphs: [
        t('myIp.aboutCards.versions.paragraph1'),
        t('myIp.aboutCards.versions.paragraph2'),
        t('myIp.aboutCards.versions.paragraph3'),
      ],
      sm: 12,
      md: 6,
      lg: 7,
    },
  ];
};

export const WhatIsIp = () => {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  return (
    <>
      <Chip color='default' variant='secondary' className='w-fit mb-2'>
        <Chip.Label> {t('myIp.learn')}</Chip.Label>
      </Chip>
      <Heading as='h2'>{t('myIp.whatIs.title')}</Heading>
      <Grid className={'mt-8'}>
        {whatIsAnIpInfo(t).map(({ id, label, paragraphs, sm, md, lg }) => (
          <GridItem size={{ base: 12, sm, md, lg }} key={id}>
            <motion.div
              className={'h-full'}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut', delay: 0.15 }}
            >
              <article className='rounded-4xl border bg-background p-6 sm:p-8 h-full'>
                <span className='text-lg font-bold'>{label}</span>
                <div className='mt-16 flex flex-col gap-4 text-base tracking-[-0.04em]'>
                  {paragraphs.map((paragraph) => (
                    <Paragraph key={paragraph}>{paragraph}</Paragraph>
                  ))}
                </div>
              </article>
            </motion.div>
          </GridItem>
        ))}
      </Grid>
    </>
  );
};
