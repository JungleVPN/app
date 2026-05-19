import { Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Block } from '../../../../ui';
import type { HwidDevice } from '../utils/devices.utils';
import { DeviceDeleteDialog } from './DeviceDeleteDialog';
import { DeviceRow } from './DeviceRow';

interface DevicesListProps {
  devices: HwidDevice[] | null;
  isFetching: boolean;
  isDeleting: boolean;
  confirmIsOpen: boolean;
  confirmSetOpen: (open: boolean) => void;
  onDeleteRequest: (hwid: string) => void;
  onConfirmDelete: () => void;
}

export function DevicesList({
  devices,
  isFetching,
  isDeleting,
  confirmIsOpen,
  confirmSetOpen,
  onDeleteRequest,
  onConfirmDelete,
}: DevicesListProps) {
  const { t } = useTranslation();

  return (
    <>
      <Block title={t('devices.listHeading')} variant='secondary'>
        {isFetching || devices === null ? (
          <div className='flex min-h-[120px] items-center justify-center py-8'>
            <Spinner color='accent' size='md' />
          </div>
        ) : devices.length === 0 ? (
          <div className='flex min-h-[80px] items-center justify-center px-4 py-6'>
            <p className='text-sm text-muted'>{t('devices.noDevices')}</p>
          </div>
        ) : (
          devices.map((device, index) => (
            <DeviceRow
              key={device.hwid}
              device={device}
              isDeleting={isDeleting}
              showSeparatorAbove={index > 0}
              onDeleteRequest={onDeleteRequest}
            />
          ))
        )}
      </Block>

      <DeviceDeleteDialog
        isOpen={confirmIsOpen}
        onOpenChange={confirmSetOpen}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
