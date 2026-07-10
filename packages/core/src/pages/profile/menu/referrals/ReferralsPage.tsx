import { Button } from '@heroui/react';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from '../../../../components';
import { coreEnv, getTelegramStickerUrl } from '../../../../env';
import { useBackButton, useClipboard, useNavigation } from '../../../../hooks';
import { useAuthStoreInfo, useNavbarStore } from '../../../../stores';
import { Page, TgsSticker } from '../../../../ui';

export default function ReferralsPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { copy, copied } = useClipboard();
  const { setNavbarVisible } = useNavbarStore();
  const { rmnUser } = useAuthStoreInfo();

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(false);
    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  const stickerUrl = getTelegramStickerUrl(coreEnv.referralsStickerFileId);
  const referralLink = `${coreEnv.webAppUrl}/?ref=${rmnUser?.uuid}`;

  return (
    <Page
      icon={stickerUrl ? <TgsSticker src={stickerUrl} className='mx-auto h-36 w-36' /> : undefined}
      title={t('referrals.pageTitle')}
    >
      <div className='flex w-full flex-col gap-3'>
        <Step step={1} title={t('referrals.step1.title')}>
          <div className='flex items-center gap-2 rounded-xl bg-default-100 py-2'>
            <p className='flex-1 truncate text-sm text-muted'>{referralLink}</p>
          </div>
          <Button
            size='sm'
            variant='secondary'
            isDisabled={!referralLink}
            onPress={() => void copy(referralLink)}
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
