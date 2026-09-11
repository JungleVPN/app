import { IconArrowsExchange, IconFingerprint, IconGlobe, IconWifi } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Grid, GridItem } from '../../ui';

const USE_CASE_CARDS = [
  { key: 'wifi', icon: <IconWifi size={24} />, color: 'text-blue-500' },
  { key: 'privacy', icon: <IconFingerprint size={24} />, color: 'text-purple-500' },
  { key: 'travel', icon: <IconGlobe size={24} />, color: 'text-emerald-500' },
  { key: 'smartRouting', icon: <IconArrowsExchange size={24} />, color: 'text-orange-500' },
] as const;

/** `valueKey` is for values that carry a translated unit, e.g. "30-day" / "30 дней". */
const STATS: readonly { key: string; value?: string; valueKey?: string }[] = [
  { key: 'speed', value: '5 Gbps' },
  { key: 'countries', value: '6+' },
  { key: 'guarantee', valueKey: 'landing.info.stats.guarantee_value' },
  { key: 'support', valueKey: 'landing.info.stats.support_value' },
];

export function InfoSection() {
  const { t } = useTranslation();

  return (
    <section>
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
            <div className='flex items-start gap-4 rounded-2xl h-full border border-divider bg-surface-secondary p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'>
              <span className={`mt-0.5 shrink-0 ${color}`}>{icon}</span>
              <div>
                <h3 className='font-semibold md:text-lg text-foreground'>
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
      <Grid className='rounded-3xl border border-divider bg-surface-secondary py-8 p-8'>
        {STATS.map(({ key, value, valueKey }) => (
          <GridItem key={key} size={{ base: 12, sm: 6, lg: 3 }}>
            <div className='flex flex-col items-center gap-1 text-center'>
              <span className='text-xl font-bold text-foreground lg:text-4xl'>
                {valueKey ? t(valueKey) : value}
              </span>
              <span className='text-xs text-muted lg:text-sm'>
                {t(`landing.info.stats.${key}`)}
              </span>
            </div>
          </GridItem>
        ))}
      </Grid>
    </section>
  );
}
