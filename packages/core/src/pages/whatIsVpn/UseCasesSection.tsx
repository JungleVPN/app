import {
  IconBriefcase,
  IconEyeOff,
  IconPlaneTilt,
  IconWifi,
  type TablerIcon,
} from '@tabler/icons-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Grid, GridItem } from '../../ui';
import { Heading } from '../../ui/Heading';

type UseCase = {
  key: string;
  icon: TablerIcon;
  color: string;
  bg: string;
  accent: string;
};

/**
 * The same tinted card treatment as the landing page's concept cards, so the
 * explainer reads as one page rather than two stitched-together designs.
 */
const USE_CASES: readonly UseCase[] = [
  {
    key: 'wifi',
    icon: IconWifi,
    color: 'text-sky-500',
    bg: 'bg-sky-100',
    accent: 'bg-sky-200/60',
  },
  {
    key: 'travel',
    icon: IconPlaneTilt,
    color: 'text-violet-500',
    bg: 'bg-violet-100',
    accent: 'bg-violet-200/60',
  },
  {
    key: 'privacy',
    icon: IconEyeOff,
    color: 'text-amber-500',
    bg: 'bg-amber-100',
    accent: 'bg-amber-200/60',
  },
  {
    key: 'work',
    icon: IconBriefcase,
    color: 'text-emerald-500',
    bg: 'bg-emerald-100',
    accent: 'bg-emerald-200/60',
  },
];

const USE_CASE_CARD: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export function UseCasesSection() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <Heading as='h2'>{t('landing.whatIsVpn.useCases.title')}</Heading>
        <p className='max-w-2xl text-base text-muted lg:text-md'>
          {t('landing.whatIsVpn.useCases.subtitle')}
        </p>
      </div>

      <motion.div
        initial={prefersReducedMotion ? false : 'hidden'}
        whileInView='show'
        viewport={{ once: true, amount: 0.2 }}
        variants={{ show: { transition: { staggerChildren: 0.12 } } }}
      >
        <Grid>
          {USE_CASES.map(({ key, icon: Icon, color, bg, accent }) => (
            <GridItem key={key} size={{ base: 12, sm: 6, lg: 3 }}>
              <motion.div
                variants={USE_CASE_CARD}
                className={`relative flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1.5 ${bg}`}
              >
                <div className={`absolute -end-8 -top-8 h-32 w-32 rounded-full ${accent}`} />
                <span className={`relative ${color}`}>
                  <Icon size={32} stroke={2} aria-hidden='true' />
                </span>
                <div className='relative'>
                  <Heading as='h3'>{t(`landing.whatIsVpn.useCases.${key}.title`)}</Heading>
                  <p className='mt-1 text-sm leading-relaxed text-[#1a1a1a]/70 text-pretty'>
                    {t(`landing.whatIsVpn.useCases.${key}.description`)}
                  </p>
                </div>
              </motion.div>
            </GridItem>
          ))}
        </Grid>
      </motion.div>
    </section>
  );
}
