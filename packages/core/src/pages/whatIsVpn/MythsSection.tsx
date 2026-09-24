import { IconCheck, IconX } from '@tabler/icons-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Heading } from '../../ui/Heading';

/** Where a VPN's protection stops — stated plainly rather than implied. */
const MYTH_KEYS = ['anonymity', 'speed', 'legal'] as const;

const MYTH_ROW: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function MythsSection() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <Heading as='h2'>{t('landing.whatIsVpn.myths.title')}</Heading>
        <p className='max-w-2xl text-base text-muted lg:text-md'>
          {t('landing.whatIsVpn.myths.subtitle')}
        </p>
      </div>

      <motion.ul
        className='mx-auto flex max-w-3xl flex-col gap-4'
        initial={prefersReducedMotion ? false : 'hidden'}
        whileInView='show'
        viewport={{ once: true, amount: 0.2 }}
        variants={{ show: { transition: { staggerChildren: 0.12 } } }}
      >
        {MYTH_KEYS.map((key) => (
          <motion.li
            key={key}
            variants={MYTH_ROW}
            className='flex flex-col gap-4 rounded-3xl bg-surface p-6 sm:p-7'
          >
            <p className='flex items-start gap-3 text-base font-semibold text-foreground text-pretty'>
              <span className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500'>
                <IconX size={16} stroke={2.5} aria-hidden='true' />
              </span>
              {t(`landing.whatIsVpn.myths.${key}.myth`)}
            </p>
            <p className='flex items-start gap-3 text-sm leading-relaxed text-muted text-pretty'>
              <span className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600'>
                <IconCheck size={16} stroke={2.5} aria-hidden='true' />
              </span>
              {t(`landing.whatIsVpn.myths.${key}.fact`)}
            </p>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
