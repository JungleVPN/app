import { Button, Chip } from '@heroui/react';
import { IconBolt, IconDevices, IconShieldCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ContentCard } from '../../components/ContentCard';
import { WorldMap } from './WorldMap';

export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className='mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 pt-48 md:px-12  lg:items-center lg:gap-12 lg:px-24'>
      <div className='flex gap-12 flex-col lg:flex-row'>
        <div className='flex flex-col items-center gap-6 text-center lg:max-w-lg lg:items-start lg:text-left'>
          <div className='flex flex-col gap-3'>
            <h1 className='text-6xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-7xl'>
              Jungle VPN
            </h1>
            <p className='max-w-xl text-base text-muted lg:text-lg'>{t('landing.hero.subtitle')}</p>
          </div>

          <div className='flex flex-col items-center gap-3 lg:items-start'>
            <Button size='lg' className='h-14 w-48 rounded-4xl' onClick={() => navigate('/login')}>
              {t('landing.hero.cta')}
            </Button>
            <Chip color='default' variant='soft' className='w-fit'>
              <IconShieldCheck size={14} />
              <Chip.Label>{t('landing.hero.guarantee')}</Chip.Label>
            </Chip>
          </div>
        </div>

        <div className='grid w-full grid-cols-2 gap-4 lg:flex-1'>
          <ContentCard
            icon={<IconBolt size={28} />}
            title={t('landing.hero.bento.speed.title')}
            description={t('landing.hero.bento.speed.description')}
          />
          <ContentCard
            icon={<IconShieldCheck size={28} />}
            title={t('landing.hero.bento.privacy.title')}
            description={t('landing.hero.bento.privacy.description')}
          />
          <ContentCard
            icon={<IconDevices size={28} />}
            title={t('landing.hero.bento.devices.title')}
            description={t('landing.hero.bento.devices.description')}
            className='col-span-2'
          />
        </div>
      </div>

      <div className='h-auto w-full lg:w-[70%] shrink-0 m-auto mt-0 mb-0 hidden sm:block'>
        <WorldMap />
      </div>
    </section>
  );
}
