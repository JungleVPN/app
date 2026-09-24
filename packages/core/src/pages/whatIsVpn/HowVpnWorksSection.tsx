import {
  IconLock,
  IconPlugConnected,
  IconRouter,
  IconWorldWww,
  type TablerIcon,
} from '@tabler/icons-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Grid, GridItem } from '../../ui';
import { Heading } from '../../ui/Heading';
import { Paragraph } from '../../ui/Paragraph';

type Step = { key: string; icon: TablerIcon };

/** The four things that happen between tapping connect and the page loading. */
const STEPS: readonly Step[] = [
  { key: 'connect', icon: IconPlugConnected },
  { key: 'encrypt', icon: IconLock },
  { key: 'tunnel', icon: IconRouter },
  { key: 'exit', icon: IconWorldWww },
];

/** Steps arrive one after another, matching the locations page's benefit row. */
const STEP_CARD: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export function HowVpnWorksSection() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <Heading as='h2'>{t('landing.whatIsVpn.how.title')}</Heading>
        <Paragraph>{t('landing.whatIsVpn.how.subtitle')}</Paragraph>
      </div>

      <motion.div
        initial={prefersReducedMotion ? false : 'hidden'}
        whileInView='show'
        viewport={{ once: true, amount: 0.2 }}
        variants={{ show: { transition: { staggerChildren: 0.15 } } }}
      >
        <Grid>
          {STEPS.map(({ key, icon: Icon }, index) => (
            <GridItem key={key} size={{ base: 12, sm: 6, lg: 3 }}>
              <motion.div
                variants={STEP_CARD}
                className='relative flex h-full flex-col gap-4 rounded-3xl bg-surface p-7 transition-transform duration-300 hover:-translate-y-1.5'
              >
                <span className='flex size-12 items-center justify-center rounded-2xl bg-linear-to-r from-purple-400 to-yellow-400 text-white'>
                  <Icon size={24} stroke={2} aria-hidden='true' />
                </span>
                <Heading as='h3'>{t(`landing.whatIsVpn.how.${key}.title`)}</Heading>
                <Paragraph>{t(`landing.whatIsVpn.how.${key}.description`)}</Paragraph>
                {index < STEPS.length - 1 && (
                  <span className='pointer-events-none absolute top-13 -end-3 hidden h-px w-6 bg-linear-to-r from-purple-400 to-yellow-400 lg:block' />
                )}
              </motion.div>
            </GridItem>
          ))}
        </Grid>
      </motion.div>
    </section>
  );
}
