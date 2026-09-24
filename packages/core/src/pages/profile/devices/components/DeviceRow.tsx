import { Button, Separator } from '@heroui/react';
import { IconTrash } from '@tabler/icons-react';
import { HwidDeviceDto } from '@workspace/types';
import { useTranslation } from 'react-i18next';
import { Paragraph } from '../../../../ui/Paragraph';
import { extractAppName, resolveDeviceIcon } from '../utils/devices.utils';

interface DeviceRowProps {
  device: HwidDeviceDto;
  isDeleting: boolean;
  showSeparatorAbove: boolean;
  onDeleteRequest: (hwid: string) => void;
}

export function DeviceRow({
  device,
  isDeleting,
  showSeparatorAbove,
  onDeleteRequest,
}: DeviceRowProps) {
  const { t } = useTranslation();
  const appName = extractAppName(device.userAgent);
  const AppIcon = resolveDeviceIcon(device.deviceModel);

  return (
    <>
      {showSeparatorAbove && <Separator className='shrink-0' variant='default' />}
      <div className='flex min-h-13 items-center gap-3 px-4 py-2.5'>
        <span aria-hidden className='shrink-0 text-muted'>
          <AppIcon stroke={1.25} size={24} />
        </span>
        <div className='min-w-0 flex-1'>
          <Paragraph>{device.deviceModel || t('devices.unknownDevice')}</Paragraph>
          {appName && <Paragraph>{appName}</Paragraph>}
        </div>
        <Button
          aria-label={t('devices.deleteDeviceLabel')}
          isIconOnly
          isPending={isDeleting}
          size='sm'
          variant='tertiary'
          onPress={() => onDeleteRequest(device.hwid)}
        >
          <IconTrash />
        </Button>
      </div>
    </>
  );
}
