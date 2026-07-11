import { Button, Separator } from '@heroui/react';
import {
  IconArrowRight,
  IconLockOpen,
  IconMoodDollar,
  IconRepeat,
  IconSparkles,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { coreEnv, getTelegramStickerUrl } from '../../../env';
import { useBackButton, useNavigation } from '../../../hooks';
import { useNavbarStore } from '../../../stores';
import { Block, Page, TgsSticker } from '../../../ui';

export default function AffiliatePage() {
  const { t } = useTranslation();
  const navigate = useNavigation();

  const firstPaymentRate = Math.round(coreEnv.referralFirstPaymentRate * 100);
  const recurringRate = Math.round(coreEnv.referralRecurringRate * 100);
  const affiliateStickerFileId = getTelegramStickerUrl(coreEnv.affiliateStickerFileId);

  const { setNavbarVisible } = useNavbarStore();

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(false);

    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  const benefits = [
    {
      id: 'first',
      icon: <IconSparkles stroke={2} className='size-5' />,
      label: t('affiliate.benefit1Label', { rate: firstPaymentRate }),
      desc: t('affiliate.benefit1Desc'),
    },
    {
      id: 'recurring',
      icon: <IconRepeat stroke={2} className='size-5' />,
      label: t('affiliate.benefit2Label', { rate: recurringRate }),
      desc: t('affiliate.benefit2Desc'),
    },
    {
      id: 'withdraw',
      icon: <IconLockOpen stroke={2} className='size-5' />,
      label: t('affiliate.benefit3Label'),
      desc: t('affiliate.benefit3Desc'),
    },
    {
      id: 'passive',
      icon: <IconMoodDollar stroke={2} className='size-5' />,
      label: t('affiliate.benefit4Label'),
      desc: t('affiliate.benefit4Desc'),
    },
  ];

  return (
    <Page
      icon={
        affiliateStickerFileId && <TgsSticker className='h-28 w-28' src={affiliateStickerFileId} />
      }
      title={t('affiliate.heroTitle')}
      subtitle={t('affiliate.heroSubtitle', { rate: firstPaymentRate })}
    >
      <Button
        fullWidth
        size='lg'
        className={'mb-3'}
        onPress={() => navigate(coreEnv.affiliatePortalUrl, { target: 'blank' })}
      >
        {t('affiliate.actionLabel')}
        <IconArrowRight size={20} stroke={2} />
      </Button>
      <Block title={t('affiliate.benefitsTitle')} description={t('affiliate.description')}>
        {benefits.map((benefit, index) => (
          <div key={benefit.id}>
            <div className='flex min-h-15 items-center gap-3 px-4 py-3'>
              <div
                className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full'
                style={{ backgroundColor: 'rgba(255, 203, 61, 0.15)', color: '#D48806' }}
              >
                {benefit.icon}
              </div>
              <div className='flex flex-col'>
                <p className='text-sm font-semibold'>{benefit.label}</p>
                <p className='text-xs text-muted'>{benefit.desc}</p>
              </div>
            </div>
            {index < benefits.length - 1 && <Separator variant='default' className='shrink-0' />}
          </div>
        ))}
      </Block>
    </Page>
  );
}
