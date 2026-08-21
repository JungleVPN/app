import { Button, Chip } from '@heroui/react';
import { IconBolt, IconRefresh, IconRocket, IconShieldCheck } from '@tabler/icons-react';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { BrandTitle } from './BrandTitle';

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

  return (
    <section className='flex flex-col justify-center items-center lg:flex-row lg:items-center lg:gap-8'>
      <motion.div
        className='flex flex-col gap-6 items-start w-full lg:text-left lg:shrink-0'
        variants={container}
        initial='hidden'
        animate='show'
      >
        <motion.div variants={item} className='flex flex-col gap-3'>
          <h1 className='text-balance'>
            <BrandTitle />
          </h1>
          <p className='text-base text-muted lg:text-md'>{t('landing.hero.subtitle')}</p>
        </motion.div>

        <div className='flex flex-col md:flex-row gap-4'>
          <motion.div variants={item} className='flex flex-col gap-3 lg:items-start'>
            <div className='flex items-start gap-3'>
              <Button
                size='lg'
                variant='outline'
                className='h-14 rounded-4xl text-white'
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
            <Chip color='default' variant='tertiary' className='w-fit text-muted'>
              <IconRefresh size={14} />
              <Chip.Label>{t('landing.hero.trial')}</Chip.Label>
            </Chip>
          </motion.div>

          <motion.ul variants={item} className='flex flex-col gap-2 items-start'>
            {features.map(({ Icon, text }) => (
              <li key={text} className='flex items-center gap-2 text-sm text-white'>
                <Icon size={32} className='text-primary shrink-0 p-1 rounded-lg' />
                <span className='text-start'>{text}</span>
              </li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
    </section>
  );
}
