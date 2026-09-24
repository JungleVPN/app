import { Button } from '@heroui/react';
import { IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSubscriptionLinkDialogStore } from '../../../../stores';
import { Paragraph } from '../../../../ui/Paragraph';

export function ExtraDeviceBlock() {
  const { t } = useTranslation();
  const { setOpen, close } = useSubscriptionLinkDialogStore();

  const openDialog = () => {
    setOpen(true);

    return () => {
      close();
    };
  };

  return (
    <div className='mb-6'>
      <Button fullWidth size='lg' onPress={openDialog}>
        {t('devices.extraDevice.openButton')}
        <IconArrowRight size={20} stroke={2} className='rtl:-scale-x-100' />
      </Button>
      <Paragraph>{t('devices.extraDevice.description')}</Paragraph>
    </div>
  );
}
