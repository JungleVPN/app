import { Button } from '@heroui/react';
import { IconDeviceLaptop, IconInfinity, IconShieldCheck } from '@tabler/icons-react';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../hooks';
import { BlurInWords, Container } from '../../ui';
import { Heading } from '../../ui/Heading';
import { Paragraph } from '../../ui/Paragraph';
import { PRICING_PATH } from '../../utils';
import { WorldMap } from '../landing/WorldMap';

type Benefit = {
  key: string;
  icon: typeof IconDeviceLaptop;
  titleKey: string;
  descriptionKey: string;
};

/**
 * The three promises repeated under the map. `platforms` reuses the landing
 * page's device copy so the two surfaces never drift apart.
 */
const BENEFITS: readonly Benefit[] = [
  {
    key: 'devices',
    icon: IconDeviceLaptop,
    titleKey: 'landing.locations.benefits.devices.title',
    descriptionKey: 'landing.locations.benefits.devices.description',
  },
  {
    key: 'traffic',
    icon: IconInfinity,
    titleKey: 'landing.locations.benefits.traffic.title',
    descriptionKey: 'landing.locations.benefits.traffic.description',
  },
  {
    key: 'platforms',
    icon: IconShieldCheck,
    titleKey: 'landing.info.devices.title',
    descriptionKey: 'landing.info.devices.subtitle',
  },
];

/** Cards rise into place one after another once the row scrolls into view. */
const BENEFIT_CARD: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const prefersReducedMotion = useReducedMotion();

  const titleWords = t('landing.locations.hero.title').split(' ').length;
  const subtitleDelay = 0.2 + titleWords * 0.06;

  return (
    <section className='relative flex min-h-screen flex-col justify-center gap-10 py-36 md:py-48 text-white'>
      <Container maxWidth='md' className='flex flex-col items-center gap-6 text-center'>
        <BlurInWords
          as='h1'
          text={t('landing.locations.hero.title')}
          className='font-primary font-extrabold text-2xl md:text-4xl text-balance'
          delay={0.2}
        />

        <BlurInWords
          as='p'
          text={t('landing.locations.hero.subtitle')}
          className='max-w-3xl text-base md:text-md text-white/70'
          delay={subtitleDelay}
        />

        <motion.div
          className='flex flex-col items-center gap-4'
          initial={prefersReducedMotion ? false : { opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: subtitleDelay + 0.5 }}
        >
          <Button
            size='lg'
            className='h-14 px-10 rounded-4xl bg-linear-to-r from-purple-400 to-yellow-400 text-white hover:opacity-90'
            onClick={() => navigate(PRICING_PATH)}
          >
            {t('common.cta')}
          </Button>

          <Paragraph className={'flex items-center gap-1 text-muted'}>
            <IconShieldCheck size={18} />
            {t('landing.hero.guarantee')}
          </Paragraph>
        </motion.div>
      </Container>

      <div className='relative'>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, filter: 'blur(24px)', scale: 1.04 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
        >
          <WorldMap />
        </motion.div>

        <Container className='relative -mt-16 md:-mt-28 lg:-mt-40'>
          <motion.ul
            className='grid gap-4 md:grid-cols-3'
            initial={prefersReducedMotion ? false : 'hidden'}
            whileInView='show'
            viewport={{ once: true, amount: 0.3 }}
            variants={{ show: { transition: { staggerChildren: 0.15 } } }}
          >
            {BENEFITS.map(({ key, icon: Icon, titleKey, descriptionKey }) => (
              <motion.li
                key={key}
                variants={BENEFIT_CARD}
                className='flex flex-col gap-4 justify-between rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md'
              >
                <div className='flex items-center gap-3'>
                  <Icon size={28} className='shrink-0' />
                  <Heading as='h4'>{t(titleKey)}</Heading>
                </div>
                <Paragraph>{t(descriptionKey)}</Paragraph>
              </motion.li>
            ))}
          </motion.ul>
        </Container>
      </div>
    </section>
  );
}
