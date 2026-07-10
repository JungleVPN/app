import { Button } from '@heroui/react';
import { IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../../../hooks';
import { useAppRoutes } from '../../../../runtime';

export function ExtraDeviceBlock() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { profileExtraDevicePurchasePath } = useAppRoutes();

  return (
    <div className='mb-6'>
      <Button fullWidth size='lg' onPress={() => navigate(profileExtraDevicePurchasePath)}>
        {t('devices.extraDevice.openButton')}
        <IconArrowRight size={20} stroke={2} />
      </Button>
      <p className='px-4 mt-1 text-xs text-muted'>{t('devices.extraDevice.description')}</p>
    </div>
  );
}
