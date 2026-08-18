import {
  IconArrowsExchange,
  IconBrandAndroid,
  IconBrandApple,
  IconBrandUbuntu,
  IconBrandWindows,
  IconDeviceLaptop,
  IconEyeOff,
  IconFingerprint,
  IconGlobe,
  IconKey,
  IconNetwork,
  IconWifi,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Grid, GridItem } from '../../ui';

const CONCEPT_CARDS = [
  {
    key: 'encryption',
    icon: <IconKey size={32} />,
    color: 'text-sky-500',
    bg: 'bg-sky-100 dark:bg-sky-950/60',
    accent: 'bg-sky-200/60 dark:bg-sky-800/20',
  },
  {
    key: 'masking',
    icon: <IconEyeOff size={32} />,
    color: 'text-violet-500',
    bg: 'bg-violet-100 dark:bg-violet-950/60',
    accent: 'bg-violet-200/60 dark:bg-violet-800/20',
  },
  {
    key: 'tunnel',
    icon: <IconNetwork size={32} />,
    color: 'text-amber-500',
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    accent: 'bg-amber-200/60 dark:bg-amber-800/20',
  },
] as const;

const USE_CASE_CARDS = [
  { key: 'wifi', icon: <IconWifi size={24} />, color: 'text-blue-500' },
  { key: 'privacy', icon: <IconFingerprint size={24} />, color: 'text-purple-500' },
  { key: 'travel', icon: <IconGlobe size={24} />, color: 'text-emerald-500' },
  { key: 'smartRouting', icon: <IconArrowsExchange size={24} />, color: 'text-orange-500' },
] as const;

const STATS = [
  { key: 'speed', value: '5 Gbps' },
  { key: 'countries', value: '6+' },
  { key: 'guarantee', value: '30' },
  { key: 'support', value: '~10m' },
] as const;

const DEVICES = [
  { key: 'ios', icon: <IconBrandApple size={32} /> },
  { key: 'android', icon: <IconBrandAndroid size={32} /> },
  { key: 'macos', icon: <IconDeviceLaptop size={32} /> },
  { key: 'windows', icon: <IconBrandWindows size={32} /> },
  { key: 'linux', icon: <IconBrandUbuntu size={32} /> },
  { key: 'appleTv', icon: <IconBrandApple size={32} /> },
  { key: 'androidTv', icon: <IconBrandAndroid size={32} /> },
] as const;

export function InfoSection() {
  const { t } = useTranslation();

  return (
    <section>
      {/* ── What is a VPN? ── */}
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
          {t('landing.info.what.title')}
        </h2>
        <p className='max-w-2xl text-base text-muted lg:text-md'>
          {t('landing.info.what.subtitle')}
        </p>
      </div>

      <Grid className='mb-24'>
        {CONCEPT_CARDS.map(({ key, icon, color, bg, accent }) => (
          <GridItem key={key} size={{ base: 12, sm: 6, lg: 4 }}>
            <div
              className={`relative flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1.5 ${bg}`}
            >
              <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${accent}`} />
              <span className={`relative ${color}`}>{icon}</span>
              <div className='relative'>
                <h3 className='text-base font-bold text-foreground'>
                  {t(`landing.info.what.${key}.title`)}
                </h3>
                <p className='mt-1 text-sm leading-relaxed text-muted'>
                  {t(`landing.info.what.${key}.description`)}
                </p>
              </div>
            </div>
          </GridItem>
        ))}
      </Grid>

      {/* ── Why you need a VPN ── */}
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
          {t('landing.info.why.title')}
        </h2>
        <p className='max-w-2xl text-base text-muted lg:text-md'>
          {t('landing.info.why.subtitle')}
        </p>
      </div>

      <Grid className='mb-4'>
        {USE_CASE_CARDS.map(({ key, icon, color }) => (
          <GridItem key={key} size={{ base: 12, sm: 6 }}>
            <div className='flex items-start gap-4 rounded-2xl border border-divider bg-surface-secondary p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'>
              <span className={`mt-0.5 shrink-0 ${color}`}>{icon}</span>
              <div>
                <h3 className='font-semibold text-foreground'>
                  {t(`landing.info.why.${key}.title`)}
                </h3>
                <p className='mt-1 text-sm leading-relaxed text-muted'>
                  {t(`landing.info.why.${key}.description`)}
                </p>
              </div>
            </div>
          </GridItem>
        ))}
      </Grid>

      {/* ── Stats strip ── */}
      <Grid className='mb-24 rounded-3xl border border-divider bg-surface-secondary p-8'>
        {STATS.map(({ key, value }) => (
          <GridItem key={key} size={{ base: 12, sm: 6, lg: 3 }}>
            <div className='flex flex-col items-center gap-1 text-center'>
              <span className='text-xl font-bold text-foreground lg:text-4xl'>{value}</span>
              <span className='text-xs text-muted lg:text-sm'>
                {t(`landing.info.stats.${key}`)}
              </span>
            </div>
          </GridItem>
        ))}
      </Grid>

      {/* ── Device support ── */}
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
          {t('landing.info.devices.title')}
        </h2>
        <p className='max-w-2xl text-base text-muted lg:text-md'>
          {t('landing.info.devices.subtitle')}
        </p>
      </div>

      <div className='flex flex-wrap items-center gap-4 justify-around'>
        {DEVICES.map(({ key, icon }) => (
          <div
            key={key}
            className='w-fit flex flex-col items-center gap-3 rounded-2xl py-6 px-4 transition-all duration-200 hover:scale-105 hover:-translate-y-1'
          >
            <span className='text-muted'>{icon}</span>
            <h3 className='text-sm font-semibold text-foreground'>
              {t(`landing.info.devices.${key}`)}
            </h3>
          </div>
        ))}
      </div>
    </section>
  );
}
