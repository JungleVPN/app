import { Button } from '@heroui/react';
import { IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { coreEnv } from '../../../../env';
import { Block } from '../../../../ui';
import { useExtraDevicePayment } from '../hooks/useExtraDevicePayment';

export function ExtraDeviceBlock() {
  const { t } = useTranslation();
  const { isPaying, handlePay } = useExtraDevicePayment();

  return (
    <Block
      title={t('devices.extraDevice.heading')}
      description={t('devices.extraDevice.description')}
    >
      <div className='p-4'>
        <Button fullWidth isPending={isPaying} size='lg' onPress={handlePay}>
          {t('devices.extraDevice.payButton', { price: coreEnv.extraDevicePrice })}
          <IconArrowRight size={20} stroke={2} />
        </Button>
      </div>
    </Block>
  );
}
