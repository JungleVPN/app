import { useTranslation } from 'react-i18next';
import FreedomIcon from '../../assets/icons/freedom-icon.svg?react';
import PrivacyIcon from '../../assets/icons/privacy-icon.svg?react';
import RoutingIcon from '../../assets/icons/routing-icon.svg?react';
import SecurityIcon from '../../assets/icons/security-icon.svg?react';
import { BlurInWords, Grid, GridItem } from '../../ui';
import { Heading } from '../../ui/Heading';
import { Paragraph } from '../../ui/Paragraph';

const USE_CASE_CARDS = [
  { key: 'wifi', icon: <FreedomIcon />, color: 'text-blue-500' },
  { key: 'privacy', icon: <PrivacyIcon />, color: 'text-purple-500' },
  { key: 'travel', icon: <SecurityIcon />, color: 'text-emerald-500' },
  { key: 'smartRouting', icon: <RoutingIcon />, color: 'text-orange-500' },
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
        <Heading as='h2'>{t('landing.info.why.title')}</Heading>
        <Paragraph>{t('landing.info.why.subtitle')}</Paragraph>
      </div>

      <Grid className='mb-4'>
        {USE_CASE_CARDS.map(({ key, icon, color }) => (
          <GridItem key={key} size={{ base: 12, sm: 6 }}>
            <div className='flex items-start gap-4 rounded-2xl h-full border border-divider bg-surface-secondary p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'>
              <span className={`mt-0.5 shrink-0 ${color}`}>{icon}</span>
              <div>
                <BlurInWords
                  as={'h3'}
                  text={t(`landing.info.why.${key}.title`)}
                  className='font-semibold md:text-lg text-foreground'
                />
                <BlurInWords
                  text={t(`landing.info.why.${key}.description`)}
                  className='mt-1 text-sm leading-relaxed text-muted'
                />
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
              <BlurInWords
                as={'h3'}
                text={`${valueKey ? t(valueKey) : value}`}
                className='text-xl font-bold text-foreground lg:text-4xl'
              />
              <BlurInWords
                as={'p'}
                text={t(`landing.info.stats.${key}`)}
                className='text-xs text-muted lg:text-sm'
              />
            </div>
          </GridItem>
        ))}
      </Grid>
    </section>
  );
}
