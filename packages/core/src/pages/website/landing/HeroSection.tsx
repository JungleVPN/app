import { Button, Card, Chip } from '@heroui/react';
import { IconHeadset, IconInfinity, IconRocket, IconShieldCheckFilled } from '@tabler/icons-react';
import { motion, Variants } from 'framer-motion';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import allDevicesIconUrl from '../../../assets/icons/all-devices-icon.svg?url';
import { useNavigation } from '../../../hooks';
import { Heading, Paragraph, svgImage } from '../../../ui';
import { PRICING_PATH } from '../../../utils';

const AllDevicesIcon = svgImage({
  src: allDevicesIconUrl,
  width: 485,
  height: 480,
  className: 'w-full max-w-sm lg:max-w-md h-auto text-gray-800 dark:text-white',
});

const FEATURES = [
  { key: 'feature1', Icon: IconInfinity },
  { key: 'feature2', Icon: IconRocket },
  { key: 'feature3', Icon: IconHeadset },
] as const;

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
  const navigate = useNavigation();

  const [sliderRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    slides: { origin: 'auto', perView: 1.2, spacing: 16 },
    breakpoints: {
      '(min-width: 640px)': {
        slides: { origin: 'auto', perView: 2.2, spacing: 24 },
      },
      '(min-width: 1024px)': {
        slides: { origin: 'auto', perView: 3, spacing: 24 },
      },
    },
  });

  const handleClick = useCallback(() => {
    navigate(PRICING_PATH);
  }, [navigate]);

  return (
    <motion.section
      className='flex flex-col gap-16 lg:gap-24'
      variants={container}
      initial='hidden'
      animate='show'
    >
      <div className='flex flex-col items-center gap-12 md:flex-row md:justify-between'>
        <div className='flex flex-col items-center gap-6 text-center md:items-start md:text-left'>
          <motion.div variants={item}>
            <Chip
              color='default'
              variant='tertiary'
              className='w-fit text-white border border-solid border-muted px-3'
            >
              <Chip.Label className={'leading-wide'}>{t('common.badge.trust')}</Chip.Label>
            </Chip>
          </motion.div>

          <motion.div variants={item} className='flex flex-col gap-4'>
            <Heading className='text-white text-[25px] sm:text-[36px] lg:text-[42px]'>
              {t('landing.hero.heading')}
            </Heading>
            <Paragraph className='text-muted text-md lg:text-lg'>
              {t('landing.hero.subtitle')}
            </Paragraph>
          </motion.div>

          <motion.div
            variants={item}
            className='flex flex-col items-center gap-4 mt-4 lg:flex-row lg:gap-6'
          >
            <Button
              size='lg'
              variant='ghost'
              className='h-14 w-72 max-w-full px-2 rounded-4xl bg-violet-500 text-white hover:opacity-90'
              onClick={handleClick}
            >
              {t('common.cta')}
            </Button>
            <span className='flex items-center gap-2 text-sm text-muted whitespace-nowrap'>
              <IconShieldCheckFilled size={20} className='shrink-0' />
              {t('landing.hero.guarantee')}
            </span>
          </motion.div>
        </div>

        <motion.div variants={item} className='flex shrink-0 justify-center w-1/2 md:w-1/3'>
          <AllDevicesIcon />
        </motion.div>
      </div>

      <motion.div variants={item}>
        <div ref={sliderRef} className='keen-slider'>
          {FEATURES.map(({ key, Icon }) => (
            <div className='keen-slider__slide' key={key}>
              <Card className='flex h-full flex-col gap-4 p-6 lg:p-8 rounded-3xl bg-white/5 border-none'>
                <Icon size={28} className='text-violet-500' />
                <Heading as='h4' className='text-white'>
                  {t(`landing.hero.features.${key}`)}
                </Heading>
                <Paragraph className='text-muted text-md lg:text-sm'>
                  {t(`landing.hero.features.${key}Description`)}
                </Paragraph>
              </Card>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
