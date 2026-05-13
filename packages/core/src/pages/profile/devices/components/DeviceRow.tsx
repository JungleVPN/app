import { Button, Separator } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import BinIcon from '../../../../assets/icons/bin-icon.svg?react';
import type { HwidDevice } from '../utils/devices.utils';
import { extractAppName, resolveDeviceIcon } from '../utils/devices.utils';

interface DeviceRowProps {
  device: HwidDevice;
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
      {showSeparatorAbove && <Separator className='shrink-0' variant='secondary' />}
      <div className='flex min-h-[52px] items-center gap-3 px-4 py-2.5'>
        <span aria-hidden className='shrink-0 text-muted'>
          <AppIcon stroke={1.25} size={24} />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-medium leading-tight text-foreground'>
            {device.deviceModel || t('devices.unknownDevice')}
          </p>
          {appName && <p className='mt-0.5 text-xs text-muted'>{appName}</p>}
        </div>
        <Button
          aria-label={t('devices.deleteDeviceLabel')}
          isIconOnly
          isPending={isDeleting}
          size='sm'
          variant='secondary'
          onPress={() => onDeleteRequest(device.hwid)}
          className='bg-[var(--quaternary-fill-background)]'
        >
          <BinIcon />
        </Button>
      </div>
    </>
  );
}
