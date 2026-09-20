import { Button } from '@heroui/react';
import { IconDeviceLaptop, IconInfinity, IconShieldCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../hooks';
import { Container } from '../../ui';
import { PRICING_PATH } from '../../utils';
import { WorldMap } from '../landing/WorldMap';

type Benefit = {
  key: string;
  icon: typeof IconDeviceLaptop;
  titleKey: string;
  descriptionKey: string;
};

/**
 * The three promises repeated under the map. `platforms` reuses the landing
 * page's device copy so the two surfaces never drift apart.
 */
const BENEFITS: readonly Benefit[] = [
  {
    key: 'devices',
    icon: IconDeviceLaptop,
    titleKey: 'landing.locations.benefits.devices.title',
    descriptionKey: 'landing.locations.benefits.devices.description',
  },
  {
    key: 'traffic',
    icon: IconInfinity,
    titleKey: 'landing.locations.benefits.traffic.title',
    descriptionKey: 'landing.locations.benefits.traffic.description',
  },
  {
    key: 'platforms',
    icon: IconShieldCheck,
    titleKey: 'landing.info.devices.title',
    descriptionKey: 'landing.info.devices.subtitle',
  },
];

export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigation();

  return (
    <section className='relative flex min-h-screen flex-col justify-center gap-10 py-48 text-white'>
      <Container maxWidth='md' className='flex flex-col items-center gap-6 text-center'>
        <h1 className='font-primary font-extrabold text-3xl md:text-4xl text-balance'>
          {t('landing.locations.hero.title')}
        </h1>

        <p className='max-w-3xl text-base md:text-md text-white/70'>
          {t('landing.locations.hero.subtitle')}
        </p>

        <div className='flex flex-col items-center gap-4'>
          <Button
            size='lg'
            className='h-14 px-10 rounded-4xl bg-linear-to-r from-purple-400 to-yellow-400 text-white hover:opacity-90'
            onClick={() => navigate(PRICING_PATH)}
          >
            {t('common.cta')}
          </Button>

          <p className='flex items-center gap-2 text-sm text-white/70'>
            <IconShieldCheck size={18} />
            {t('landing.hero.guarantee')}
          </p>
        </div>
      </Container>

      <div className='relative'>
        <WorldMap />

        <Container className='relative -mt-16 md:-mt-28 lg:-mt-40'>
          <ul className='grid gap-4 md:grid-cols-3'>
            {BENEFITS.map(({ key, icon: Icon, titleKey, descriptionKey }) => (
              <li
                key={key}
                className='flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md'
              >
                <div className='flex items-center gap-3'>
                  <Icon size={28} className='shrink-0' />
                  <h2 className='font-semibold text-sm md:text-md text-balance'>{t(titleKey)}</h2>
                </div>
                <p className='text-sm text-white/70'>{t(descriptionKey)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </section>
  );
}
