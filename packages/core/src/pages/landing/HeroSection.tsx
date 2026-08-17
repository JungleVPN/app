import { Button, Chip, Surface } from '@heroui/react';
import {
  IconBolt,
  IconDevices,
  IconInfinity,
  IconRefresh,
  IconRocket,
  IconShieldCheck,
  IconWorld,
} from '@tabler/icons-react';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Globe } from './Globe';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14 } },
};

const item: Variants | undefined = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    { Icon: IconShieldCheck, text: t('landing.hero.features.feature1') },
    { Icon: IconRocket, text: t('landing.hero.features.feature2') },
    { Icon: IconBolt, text: t('landing.hero.features.feature3') },
  ];

  const stats = [
    {
      Icon: IconWorld,
      value: t('landing.hero.stats.locations.value'),
      label: t('landing.hero.stats.locations.label'),
    },
    {
      Icon: IconInfinity,
      value: t('landing.hero.stats.traffic.value'),
      label: t('landing.hero.stats.traffic.label'),
    },
    {
      Icon: IconDevices,
      value: t('landing.hero.stats.devices.value'),
      label: t('landing.hero.stats.devices.label'),
    },
  ];

  return (
    <section className='flex flex-col pt-36 justify-center items-center lg:flex-row lg:items-center lg:gap-8'>
      <div aria-hidden className='pointer-events-none fixed inset-0 -z-10'>
        <div className='absolute -left-40 -top-40 h-175 w-175 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/15' />
        <div className='absolute -bottom-20 right-0 h-125 w-150 rounded-full bg-amber-400/8 blur-3xl dark:bg-amber-400/12' />
        <div
          className='absolute inset-0 opacity-[0.18] mix-blend-overlay'
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
      </div>
      <motion.div
        className='flex flex-col items-center gap-6 text-center lg:items-start lg:text-left lg:shrink-0'
        variants={container}
        initial='hidden'
        animate='show'
      >
        <motion.div variants={item} className='flex flex-col gap-3'>
          <h1 className='max-w-xl text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl'>
            {t('landing.hero.title')}
          </h1>
          <p className='max-w-xl text-base text-muted lg:text-md'>{t('landing.hero.subtitle')}</p>
        </motion.div>

        <motion.ul variants={item} className='flex flex-col gap-2 items-start'>
          {features.map(({ Icon, text }) => (
            <li key={text} className='flex items-center gap-2 text-sm text-muted'>
              <Icon size={32} className='text-primary shrink-0 p-1 rounded-lg' />
              <span className='text-start'>{text}</span>
            </li>
          ))}
        </motion.ul>

        <motion.div variants={item} className='flex flex-col gap-3 lg:items-start'>
          <div className='flex items-start gap-3'>
            <Button
              size='lg'
              variant='ghost'
              className='h-14 rounded-4xl'
              onClick={() => navigate('/login')}
            >
              {t('landing.hero.login')}
            </Button>
            <Button
              size='lg'
              variant='ghost'
              className='h-14 w-48 rounded-4xl bg-linear-to-r from-violet-500 to-amber-400 text-white hover:opacity-90'
              onClick={() => navigate('/login')}
            >
              {t('landing.hero.cta')}
            </Button>
          </div>
          <Chip color='default' variant='soft' className='w-fit'>
            <IconRefresh size={14} />
            <Chip.Label>{t('landing.hero.trial')}</Chip.Label>
          </Chip>
        </motion.div>

        <motion.div variants={item}>
          <Surface variant={'secondary'} className='flex items-center gap-8 p-4 rounded-2xl'>
            {stats.map(({ Icon, value, label }) => (
              <div key={label} className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <Icon size={20} className='text-muted shrink-0' />
                  <div className='flex flex-col text-start'>
                    <span className='text-sm font-semibold text-foreground leading-tight'>
                      {value}
                    </span>
                    <span className='text-xs text-muted leading-tight'>{label}</span>
                  </div>
                </div>
              </div>
            ))}
          </Surface>
        </motion.div>
      </motion.div>

      <motion.div
        className='w-full lg:w-2/4'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
      >
        <Globe />
      </motion.div>
    </section>
  );
}
