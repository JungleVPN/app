import { Button } from '@heroui/react';
import { IconShieldCheck } from '@tabler/icons-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../hooks';
import { BlurInWords, Container } from '../../ui';
import { Paragraph } from '../../ui/Paragraph';
import { PRICING_PATH } from '../../utils';

/**
 * The dark, gradient-lit opening of the explainer — the landing hero's blobs and
 * the locations hero's word-by-word reveal, so the three surfaces open the same way.
 */
export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const prefersReducedMotion = useReducedMotion();

  const titleWords = t('landing.whatIsVpn.hero.title').split(' ').length;
  const subtitleDelay = 0.2 + titleWords * 0.06;

  return (
    <section className='relative overflow-hidden pt-42 pb-32 md:py-56 text-white'>
      <div className='absolute inset-0 pointer-events-none opacity-40 overflow-hidden'>
        <div
          className='absolute inset-0 blur-3xl'
          style={{
            backgroundImage:
              'radial-gradient(60% 60% at 20% 15%, #ffb900 0%, transparent 90%),' +
              'radial-gradient(60% 60% at 80% 10%, #8e51ff 0%, transparent 90%),' +
              'radial-gradient(60% 60% at 50% 55%, #E57575 0%, transparent 90%)',
          }}
        />
      </div>

      <Container maxWidth='md' className='relative flex flex-col items-center gap-6 text-center'>
        <BlurInWords
          as='h1'
          text={t('landing.whatIsVpn.hero.title')}
          className='font-primary font-extrabold text-2xl md:text-4xl text-balance'
          delay={0.2}
        />

        <BlurInWords
          as='p'
          text={t('landing.whatIsVpn.hero.subtitle')}
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

          <Paragraph>
            <IconShieldCheck size={18} />
            {t('landing.hero.guarantee')}
          </Paragraph>
        </motion.div>
      </Container>
    </section>
  );
}
