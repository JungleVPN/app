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
    <section id='trial'>
      <div className='relative overflow-hidden p-8 rounded-3xl bg-linear-to-r  from-purple-400 to-yellow-400 py-16 text-center shadow-xl'>
        <div className='relative flex flex-col items-center gap-6'>
          <Chip color='default' variant='soft' className='bg-white/30 text-white backdrop-blur-sm'>
            <IconSparkles size={14} />
            <Chip.Label>{t('landing.freeTrial.badge')}</Chip.Label>
          </Chip>

          <div className='flex flex-col gap-3'>
            <h2 className='text-xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl'>
              {t('landing.freeTrial.title', { days })}
            </h2>
            <p className='text-base text-white/80 lg:text-md px-4 lg:px-48'>
              {t('landing.freeTrial.subtitle')}
            </p>
          </div>

          <Button
            size='lg'
            className=' font-semibold shadow-lg '
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
