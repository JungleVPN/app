import { Chip } from '@heroui/react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import CollectInfoIcon from '../../assets/icons/collect-info-icon.svg?react';
import IpIcon from '../../assets/icons/ip-address-icon.svg?react';
import { Grid, GridItem } from '../../ui';
import { Span } from '../../ui/Grid/GridItem';

const whatIsAnIpInfo = (): {
  id: string;
  label: string;
  description: string;
  sm: Span | undefined;
  md: Span | undefined;
  lg: Span | undefined;
}[] => {
  return [
    {
      id: 'ip-address',
      label: '127.0.0.1',
      description:
        'An IP address is a unique number assigned to all devices, including computers, tablets, and smartphones, during an internet connection.',
      sm: 12,
      md: 6,
      lg: 4,
    },
    {
      id: 'Public IP addresses',
      label: 'Public IP addresses',
      description:
        "They can be compared to a postal address. You can't get a letter from a friend if you don't give them your mailing address, and you can't download pictures and text from a website if you don't give them your IP address.",
      sm: 12,
      md: 6,
      lg: 8,
    },
    {
      id: 'Private IP addresses',
      label: 'Private IP addresses',
      description:
        'Your computer has not only a public IP address, but also a private IP one. ' +
        'These are issued when you connect to a private network. ' +
        'Private IP addresses are used to transmit information within a private network without connecting to the Internet. ' +
        'Typically, private IP addresses begin with the number combination 192.168. It indicates that they belong to a private network. ' +
        'Private IP addresses are assigned by routers when the device is connected to your home network.',
      sm: 12,
      md: 6,
      lg: 5,
    },
    {
      id: 'browser',
      label: 'IP address versions',
      description:
        'There are two IP address standards currently in use: IP version 4 (IPv4) and IP version 6 (IPv6). The difference between them is the format and the number of characters. However, both standards are used for device identification and location-based addressing.\n' +
        '\n' +
        'IPv4 consists of four sets of 1-3 digits separated by a dot, for example, 170.0.0.1. The maximum number of possible unique combinations is about 4 billion. However, by the time the number of connected devices exceeded 4 billion, a new standard was needed, and that standard was IPv6.\n' +
        '\n' +
        'IPv6 consists of eight groups of four hexadecimal digits separated by colons, for example, 3ffe:1900:fe21:4545. Its length can be increased if necessary. This standard creates 3.4×10^38 possible unique combinations, which is enough for mankind "with reserve".',
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
          {whatIsAnIpInfo().map(({ id, label, description, sm, md, lg }) => (
            <GridItem size={{ base: 12, sm, md, lg }} key={id}>
              <motion.div
                className={'h-full'}
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: 'easeOut', delay: 0.15 }}
              >
                <article className='rounded-4xl border bg-background p-6 sm:p-8 h-full'>
                  <span className='text-lg font-bold'>{label}</span>
                  <p className='mt-16 text-base tracking-[-0.04em]'>{description}</p>
                </article>
              </motion.div>
            </GridItem>
          ))}
        </Grid>
      </div>
    </section>
  );
};
