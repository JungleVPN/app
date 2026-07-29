import { Button, Chip } from '@heroui/react';
import { IconShieldCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { WorldMap } from './WorldMap';

export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className='flex h-full flex-col gap-16 pt-48'>
      <div className='mx-auto flex w-full max-w-7xl  flex-col items-center justify-center gap-6 px-6 text-center md:px-12 lg:px-24'>
        <div className='flex flex-col gap-3'>
          <h1 className='text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-7xl'>
            Jungle VPN
          </h1>
          <p className='mx-auto max-w-xl text-base text-muted lg:text-lg'>
            {t('landing.hero.subtitle')}
          </p>
        </div>
        <div className='flex flex-col items-center gap-3'>
          <Button size='lg' onClick={() => navigate('/login')}>
            {t('landing.hero.cta')}
          </Button>
          <Chip color='default' variant='soft' className='w-fit'>
            <IconShieldCheck size={14} />
            <Chip.Label>{t('landing.hero.guarantee')}</Chip.Label>
          </Chip>
        </div>
      </div>

      <div className='h-auto w-full lg:w-[70%] shrink-0 m-auto mt-0 mb-0'>
        <WorldMap />
      </div>
    </section>
  );
}
