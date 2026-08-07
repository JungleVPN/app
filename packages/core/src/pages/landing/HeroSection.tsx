import { Button, Chip } from '@heroui/react';
import { IconCheck, IconShieldCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Globe } from './Globe';

export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    t('landing.hero.features.smartSplit'),
    t('landing.hero.features.russianServices'),
    t('landing.hero.features.speed'),
  ];
  return (
    <section className='mx-auto flex w-full max-w-7xl flex-col gap-0 px-6 pt-36 md:px-12 lg:px-24'>
      <div className='flex flex-col items-center lg:flex-row lg:items-center lg:gap-12'>
        <div className='flex flex-col items-center gap-6 text-center lg:max-w-lg lg:items-start lg:text-left lg:shrink-0'>
          <div className='flex flex-col gap-3'>
            <h1 className='text-6xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-7xl'>
              Jungle VPN
            </h1>
            <p className='max-w-xl text-base text-muted lg:text-lg'>{t('landing.hero.subtitle')}</p>
          </div>

          <ul className='flex flex-col gap-2 items-start'>
            {features.map((feature) => (
              <li key={feature} className='flex items-center gap-2 text-sm text-muted'>
                <IconCheck size={16} className='text-primary shrink-0' />
                <span className='text-start'>{feature}</span>
              </li>
            ))}
          </ul>

          <div className='flex flex-col items-center gap-3 lg:items-start'>
            <div className='flex items-center gap-3'>
              <Button
                size='lg'
                variant='tertiary'
                className='h-14 rounded-4xl'
                onClick={() => navigate('/login')}
              >
                {t('landing.hero.login')}
              </Button>
              <Button
                size='lg'
                className='h-14 w-48 rounded-4xl'
                onClick={() => navigate('/login')}
              >
                {t('landing.hero.cta')}
              </Button>
            </div>
            <Chip color='default' variant='soft' className='w-fit'>
              <IconShieldCheck size={14} />
              <Chip.Label>{t('landing.hero.trial')}</Chip.Label>
            </Chip>
          </div>
        </div>

        <div className='w-full max-w-lg mx-auto lg:max-w-none lg:flex-1'>
          <Globe />
        </div>
      </div>
    </section>
  );
}
