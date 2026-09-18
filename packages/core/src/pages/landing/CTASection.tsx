import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

export function CTASection({ onCtaClick }: { onCtaClick?: () => void } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section id='cta'>
      <div className='relative overflow-hidden p-8 rounded-3xl bg-linear-to-r  from-purple-400 to-yellow-400 py-16 text-center shadow-xl'>
        <div className='relative flex flex-col items-center gap-6'>
          <div className='flex flex-col gap-3'>
            <h2 className='text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl'>
              {t('landing.cta.title')}
            </h2>
            <p className='text-base text-white/80 lg:text-md px-4 lg:px-48'>
              {t('landing.cta.subtitle')}
            </p>
          </div>

          <Button
            size='lg'
            className=' font-semibold shadow-lg '
            onClick={onCtaClick ?? (() => navigate('/login'))}
          >
            {t('common.cta')}
          </Button>
        </div>
      </div>
    </section>
  );
}
