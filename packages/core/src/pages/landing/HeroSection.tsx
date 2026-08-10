import { Button, Chip } from '@heroui/react';
import { IconCheck, IconShieldCheck } from '@tabler/icons-react';
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
    t('landing.hero.features.smartSplit'),
    t('landing.hero.features.russianServices'),
    t('landing.hero.features.speed'),
  ];
  return (
    <section className='flex flex-col pt-36 justify-center items-center lg:flex-row lg:items-center lg:gap-8'>
      <motion.div
        className='flex flex-col items-center gap-6 text-center lg:items-start lg:text-left lg:shrink-0'
        variants={container}
        initial='hidden'
        animate='show'
      >
        <motion.div variants={item} className='flex flex-col gap-3'>
          <h1 className='text-6xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-7xl'>
            Jungle VPN
          </h1>
          <p className='max-w-xl text-base text-muted lg:text-lg'>{t('landing.hero.subtitle')}</p>
        </motion.div>

        <motion.ul variants={item} className='flex flex-col gap-2 items-start'>
          {features.map((feature) => (
            <li key={feature} className='flex items-center gap-2 text-sm text-muted'>
              <IconCheck size={16} className='text-primary shrink-0' />
              <span className='text-start'>{feature}</span>
            </li>
          ))}
        </motion.ul>

        <motion.div variants={item} className='flex flex-col items-center gap-3 lg:items-start'>
          <div className='flex items-center gap-3'>
            <Button
              size='lg'
              variant='tertiary'
              className='h-14 rounded-4xl'
              onClick={() => navigate('/login')}
            >
              {t('landing.hero.login')}
            </Button>
            <Button size='lg' className='h-14 w-48 rounded-4xl' onClick={() => navigate('/login')}>
              {t('landing.hero.cta')}
            </Button>
          </div>
          <Chip color='default' variant='soft' className='w-fit'>
            <IconShieldCheck size={14} />
            <Chip.Label>{t('landing.hero.trial')}</Chip.Label>
          </Chip>
        </motion.div>
      </motion.div>

      <motion.div
        className='w-full lg:w-2/4'
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
      >
        <Globe />
      </motion.div>
    </section>
  );
}
