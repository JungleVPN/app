import { Spinner } from '@heroui/react';
import { HwidDeviceDto } from '@workspace/types';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Block } from '../../../../ui';
import { Paragraph } from '../../../../ui/Paragraph';
import { DeviceDeleteDialog } from './DeviceDeleteDialog';
import { DeviceRow } from './DeviceRow';

interface DevicesListProps {
  devices: HwidDeviceDto[] | null;
  isFetching: boolean;
  isDeleting: boolean;
  confirmIsOpen: boolean;
  confirmSetOpen: (open: boolean) => void;
  onDeleteRequest: (hwid: string) => void;
  onConfirmDelete: () => void;
  titleBadge?: ReactNode;
}

export function DevicesList({
  devices,
  isFetching,
  isDeleting,
  confirmIsOpen,
  confirmSetOpen,
  onDeleteRequest,
  onConfirmDelete,
  titleBadge,
}: DevicesListProps) {
  const { t } = useTranslation();

  return (
    <>
      <Block title={t('devices.listHeading')} titleBadge={titleBadge} variant='secondary'>
        {isFetching || devices === null ? (
          <div className='flex min-h-30 items-center justify-center py-8'>
            <Spinner color='accent' size='md' />
          </div>
        ) : devices.length === 0 ? (
          <div className='flex min-h-20 items-center justify-center px-4 py-6'>
            <Paragraph>{t('devices.noDevices')}</Paragraph>
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
