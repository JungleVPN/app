import { Button } from '@heroui/react';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Step } from '../../../../components';
import { coreEnv, getTelegramStickerUrl } from '../../../../env';
import { useBackButton, useClipboard } from '../../../../hooks';
import { useNavbarStore } from '../../../../stores';
import { Page, TgsSticker } from '../../../../ui';

const REFERRAL_LINK_PLACEHOLDER = 'https://jvpn.app/ref/PLACEHOLDER';

export default function ReferralsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { copy, copied } = useClipboard();
  const { setNavbarVisible } = useNavbarStore();

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(false);
    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  const stickerUrl = getTelegramStickerUrl(coreEnv.referralsStickerFileId);

  return (
    <Page
      icon={stickerUrl ? <TgsSticker src={stickerUrl} className='mx-auto h-36 w-36' /> : undefined}
      title={t('referrals.pageTitle')}
    >
      <div className='flex w-full flex-col gap-3'>
        <Step step={1} title={t('referrals.step1.title')}>
          <div className='flex items-center gap-2 rounded-xl bg-default-100 py-2'>
            <p className='flex-1 truncate text-sm text-muted'>{REFERRAL_LINK_PLACEHOLDER}</p>
          </div>
          <Button
            size='sm'
            variant='secondary'
            onPress={() => void copy(REFERRAL_LINK_PLACEHOLDER)}
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            {copied ? t('referrals.step1.copied') : t('referrals.step1.copy')}
          </Button>
        </Step>
        <Step
          step={2}
          title={t('referrals.step2.title')}
          description={t('referrals.step2.description')}
        />
        <Step
          step={3}
          title={t('referrals.step3.title')}
          description={t('referrals.step3.description')}
        />
        <Step
          step={4}
          title={t('referrals.step4.title')}
          description={t('referrals.step4.description')}
        />
      </div>
    </Page>
  );
}
