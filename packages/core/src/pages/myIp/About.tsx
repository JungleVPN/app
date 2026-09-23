import { Chip } from '@heroui/react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import CollectInfoIcon from '../../assets/icons/collect-info-icon.svg?react';
import IpIcon from '../../assets/icons/ip-address-icon.svg?react';
import { Grid, GridItem } from '../../ui';
import { Span } from '../../ui/Grid/GridItem';

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

export const About = () => {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  return (
    <section className={'pt-8 lg:pt-16'}>
      <h2 className='font-primary text-2xl md:text-4xl font-extrabold tracking-[-0.035em]'>
        {t('myIp.connection.title')}
      </h2>

      <Grid className='mt-12 gap-4'>
        <GridItem size={{ base: 12 }}>
          <Grid className='gap-4'>
            <GridItem size={{ base: 12, md: 6 }} className='md:order-1'>
              <div className='flex flex-col justify-center gap-3 rounded-4xl bg-[#f2ecfd] px-8 py-14 text-center h-full'>
                <h3 className='font-primary font-bold text-xl md:text-2xl text-foreground'>
                  {t('myIp.reveal.title')}
                </h3>
                <p className='text-sm text-muted'>{t('myIp.reveal.body')}</p>
              </div>
            </GridItem>

            <GridItem size={{ base: 12, md: 6 }} className='md:order-2'>
              <div className='flex items-center justify-center overflow-hidden rounded-4xl bg-background'>
                <IpIcon
                  aria-hidden='true'
                  focusable='false'
                  className='h-64 w-64 md:h-88 md:w-88'
                />
              </div>
            </GridItem>
          </Grid>
        </GridItem>

        <GridItem size={{ base: 12 }}>
          <Grid className='gap-6'>
            <GridItem size={{ base: 12, md: 6 }} className='md:order-2'>
              <div className='flex flex-col justify-center gap-3 rounded-4xl bg-[#f2ecfd] px-8 py-14 text-center h-full'>
                <h3 className='font-primary font-bold text-xl md:text-2xl text-foreground'>
                  {t('myIp.fingerprint.title')}
                </h3>
                <p className='text-sm text-muted'>{t('myIp.fingerprint.body')}</p>
              </div>
            </GridItem>

            <GridItem size={{ base: 12, md: 6 }} className='md:order-1'>
              <div className='flex items-center justify-center overflow-hidden rounded-4xl bg-background'>
                <CollectInfoIcon
                  aria-hidden='true'
                  focusable='false'
                  className='h-64 w-64 md:h-88 md:w-88'
                />
              </div>
            </GridItem>
          </Grid>
        </GridItem>
      </Grid>

      <div className='mt-56'>
        <Chip color='default' variant='secondary' className='w-fit mb-2'>
          <Chip.Label> {t('myIp.learn')}</Chip.Label>
        </Chip>
        <h2 className='font-primary text-xl font-extrabold md:text-3xl'>
          {t('myIp.whatIs.title')}
        </h2>
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
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              </motion.div>
            </GridItem>
          ))}
        </Grid>
      </div>
    </section>
  );
};
