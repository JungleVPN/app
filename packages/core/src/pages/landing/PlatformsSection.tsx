import { Button } from '@heroui/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PlatformsIcon from '../../assets/icons/platforms-icon.svg?react';
import { Platforms } from '../../components/Platforms/Platforms';
import { useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useAuthStore } from '../../stores';
import { Heading } from '../../ui';
import { Paragraph } from '../../ui/Paragraph';
import { PRICING_PATH } from '../../utils';

export function PlatformsSection() {
  const { t } = useTranslation();
  const { authUser } = useAuthStore();
  const { profileSubscriptionPath } = useAppRoutes();

  const navigate = useNavigation();

  const handleClick = useCallback(() => {
    if (!authUser) {
      navigate(PRICING_PATH);
    } else {
      navigate(profileSubscriptionPath);
    }
  }, [navigate, authUser, profileSubscriptionPath]);

  return (
    <section className={'bg-white relative p-6 md:p-8 rounded-4xl shadow-sm'}>
      <div className='flex flex-col md:flex-row gap-12 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex flex-col items-center gap-4 text-center md:items-start lg:text-left'>
          <Heading as='h2'>{t('landing.info.devices.title')}</Heading>
          <Paragraph>{t('landing.info.devices.subtitle')}</Paragraph>
          <Button
            size='lg'
            variant='primary'
            onClick={handleClick}
            className='h-14 min-w-full sm:min-w-xs w-fit px-8 rounded-4xl bg-linear-to-r from-violet-500 to-amber-400 text-white hover:opacity-90'
          >
            {t('landing.info.devices.cta')}
          </Button>
        </div>

        <div className='hidden sm:block flex h-64 w-full items-center justify-center rounded-3xl lg:h-80 lg:w-96 lg:shrink-0'>
          <PlatformsIcon />
        </div>
      </div>

      <Platforms className={'mt-12'} />
    </section>
  );
}
