import { Button, Chip } from '@heroui/react';
import { IconSparkles } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { coreEnv } from '../../env';

export function FreeTrialSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const days = coreEnv.trialPeriodInDays;

  return (
    <section className='mx-auto w-full px-6 py-16 md:px-12 lg:px-24'>
      <div className='relative overflow-hidden rounded-3xl bg-linear-to-r  from-purple-400 to-yellow-400 px-8 py-16 text-center shadow-xl md:px-16'>
        <div className='relative flex flex-col items-center gap-6'>
          <Chip color='default' variant='soft' className='bg-white/30 text-white backdrop-blur-sm'>
            <IconSparkles size={14} />
            <Chip.Label>{t('landing.freeTrial.badge')}</Chip.Label>
          </Chip>

          <div className='flex flex-col gap-3'>
            <h2 className='text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl'>
              {t('landing.freeTrial.title', { days })}
            </h2>
            <p className='text-base text-white/80 lg:text-lg'>{t('landing.freeTrial.subtitle')}</p>
          </div>

          <Button
            size='lg'
            className='bg-white font-semibold text-emerald-700 shadow-lg hover:bg-white/90'
            onClick={() => navigate('/login')}
          >
            {t('landing.freeTrial.cta')}
          </Button>

          <p className='text-sm text-white/70'>{t('landing.freeTrial.disclaimer', { days })}</p>
        </div>
      </div>
    </section>
  );
}
