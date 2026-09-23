import { IconCompass, IconMapPin } from '@tabler/icons-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TFunction } from 'i18next';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../api';
import { useIpStatus } from '../../hooks';
import { Grid, GridItem } from '../../ui';
import { phCapture } from '../../utils';
import { StaticLocationMap } from './StaticLocationMap';

function countryName(countryCode: string | null, language: string): string {
  if (!countryCode) return '—';
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

function browserName(t: TFunction): string {
  if (typeof navigator === 'undefined') return '—';
  const agent = navigator.userAgent;
  if (agent.includes('Edg/')) return 'Microsoft Edge';
  if (agent.includes('Firefox/')) return 'Firefox';
  if (agent.includes('Chrome/')) return 'Chrome';
  if (agent.includes('Safari/')) return 'Safari';
  return t('myIp.browser.unknown');
}

function operatingSystem(t: TFunction): string {
  if (typeof navigator === 'undefined') return '—';
  const agent = navigator.userAgent;
  if (agent.includes('Mac OS X')) return 'macOS';
  if (agent.includes('Windows')) return 'Windows';
  if (agent.includes('Android')) return 'Android';
  if (agent.includes('iPhone') || agent.includes('iPad')) return 'iOS';
  if (agent.includes('Linux')) return 'Linux';
  return t('myIp.os.unknown');
}

export const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const status = useIpStatus(useRemnawaveApi());
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    phCapture('my_ip_viewed');
  }, []);

  const connectionFields = [
    { label: t('myIp.card.ip'), value: status?.ip ?? '—', icon: IconCompass },
    {
      label: t('myIp.card.location'),
      value:
        [status?.city, countryName(status?.countryCode ?? null, i18n.language)]
          .filter(Boolean)
          .join(', ') || '—',
      icon: IconMapPin,
    },
  ];
  const mapCoordinates =
    status?.latitude !== null &&
    status?.latitude !== undefined &&
    status?.longitude !== null &&
    status?.longitude !== undefined
      ? { latitude: status.latitude, longitude: status.longitude }
      : null;
  const detailFields = [
    [t('myIp.card.isp'), status?.isp ?? t('myIp.unavailable')],
    [t('myIp.card.browser'), browserName(t)],
    [t('myIp.card.os'), operatingSystem(t)],
  ] as const;

  return (
    <section className={'pt-42 pb-32 md:py-56'}>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <h1 className='text-3xl font-extrabold tracking-[-0.04em] md:text-4xl'>
          {t('myIp.title')}
        </h1>
        <p className='mt-4 text-sm text-muted md:text-lg'>{t('myIp.subtitle')}</p>
      </motion.div>
      <Grid className='mt-8 gap-4'>
        <GridItem size={{ lg: 7, md: 6 }} className={'flex flex-col gap-4'}>
          {connectionFields.map(({ label, value, icon: Icon }) => (
            <motion.article
              key={label}
              className='flex min-h-36 flex-col rounded-4xl border bg-white p-6 sm:p-8'
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut', delay: 0.15 }}
            >
              <div className='flex items-center justify-between text-[#6f7787]'>
                <span className='text-lg'>{label}</span>
                <Icon size={30} stroke={1.6} aria-hidden='true' />
              </div>
              <p className='mt-auto text-xl font-bold tracking-[-0.04em]'>{value}</p>
            </motion.article>
          ))}

          <div className='order-3'>
            <motion.div
              className='rounded-4xl border bg-white px-6 sm:px-8'
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut', delay: 0.2 }}
            >
              {detailFields.map(([label, value], index) => (
                <div
                  key={label}
                  className={`flex flex-col gap-1 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-6 ${index ? 'border-t border-[#d5dbe6]' : ''}`}
                >
                  <span className='text-muted'>{label}</span>
                  <span className='text-left font-medium sm:text-right'>{value}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </GridItem>

        <GridItem size={{ lg: 5, md: 6 }} className='order-2'>
          {mapCoordinates && (
            <motion.div
              className='h-full'
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut', delay: 0.25 }}
            >
              <StaticLocationMap {...mapCoordinates} location={connectionFields[1].value} />
            </motion.div>
          )}
        </GridItem>
      </Grid>
    </section>
  );
};
