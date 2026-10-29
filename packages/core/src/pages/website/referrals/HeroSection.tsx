import { Button, Chip } from '@heroui/react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import referralsIconUrl from '../../../assets/icons/referrals-page-hero-icon.svg?url';
import { useNavigation } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { BlurInWords, svgImage } from '../../../ui';

const ReferralsIcon = svgImage({
  src: referralsIconUrl,
  width: 426,
  height: 581,
  className: 'w-auto w-full h-full text-gray-800 dark:text-white',
});

export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { authGateRedirectPath, profileReferralsPath } = useAppRoutes();
  const prefersReducedMotion = useReducedMotion();

  const inviteHref = `${authGateRedirectPath}?to=${encodeURIComponent(profileReferralsPath)}`;

  return (
    <section className='flex flex-col items-center gap-8 text-center bg-white rounded-t-[4rem] rounded-b-[4rem] py-12 md:py-8'>
      <div className='flex flex-col items-center gap-6'>
        <Chip
          color='default'
          variant='tertiary'
          className='w-fit rounded-full border border-[#1a1a1a]/15 bg-transparent px-4 py-1 text-sm text-[#1a1a1a]/70'
        >
          <Chip.Label>{t('referrals.hero.badge')}</Chip.Label>
        </Chip>

        <BlurInWords
          as='h1'
          text={t('referrals.hero.title')}
          className='font-primary font-extrabold text-2xl md:text-4xl text-balance text-[#1a1a1a]'
          delay={0.2}
        />

        <BlurInWords
          as='p'
          text={t('referrals.hero.subtitle')}
          className='max-w-2xl text-base md:text-md text-[#1a1a1a]/70'
          delay={0.2}
        />

        <Button
          size='lg'
          className='h-14 px-10 rounded-4xl bg-violet-500 text-white hover:opacity-90'
          onClick={() => navigate(inviteHref)}
        >
          {t('referrals.hero.cta')}
        </Button>
      </div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, filter: 'blur(24px)', scale: 1.04 }}
        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      >
        <ReferralsIcon className='w-full max-w-md h-80 md:h-100' loading='eager' />
      </motion.div>
    </section>
  );
}
