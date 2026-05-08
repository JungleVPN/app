import { AlertDialog, Button, Card, Separator, Spinner, useOverlayState } from '@heroui/react';
import {
  IconBrandAndroid,
  IconBrandAppleFilled,
  IconBrandWindows,
  IconDeviceImacFilled,
  IconDeviceMobile,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../../api';
import BinIcon from '../../../assets/icons/bin-icon.svg?react';
import DevicePageIcon from '../../../assets/icons/device-icon.svg?react';
import { useDeleteDevice, useUserDevices } from '../../../hooks';
import { useAuthStoreInfo } from '../../../stores';
import { Page } from '../../../ui';

interface HwidDevice {
  hwid: string;
  userUuid: string;
  platform: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function extractAppName(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const firstToken = userAgent.split('/')[0].split(' ')[0].trim();
  return firstToken || null;
}

function resolveDeviceIcon(device: string | null) {
  if (!device) return IconDeviceMobile;
  const value = device.toLowerCase();
  if (value.includes('mac')) return IconDeviceImacFilled;
  if (value.includes('iphone')) return IconDeviceMobile;
  if (value.includes('ios')) return IconBrandAppleFilled;
  if (value.includes('android')) return IconBrandAndroid;
  if (value.includes('windows')) return IconBrandWindows;
  return IconDeviceMobile;
}

interface DeviceRowProps {
  device: HwidDevice;
  isDeleting: boolean;
  showSeparatorAbove: boolean;
  onDeleteRequest: (hwid: string) => void;
}

function DeviceRow({ device, isDeleting, showSeparatorAbove, onDeleteRequest }: DeviceRowProps) {
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
          className={'bg-[var(--quaternary-fill-background)]'}
        >
          <BinIcon />
        </Button>
      </div>
    </>
  );
}

export default function DevicesPage() {
  const { t } = useTranslation();
  const remnawaveApi = useRemnawaveApi();
  const { rmnUser } = useAuthStoreInfo();

  const [devices, setDevices] = useState<HwidDevice[] | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const confirmState = useOverlayState();

  const { isLoading: isFetching, execute: fetchDevices } = useUserDevices(remnawaveApi);
  const { isLoading: isDeleting, execute: deleteDevice } = useDeleteDevice(remnawaveApi);

  useEffect(() => {
    if (!rmnUser?.uuid) return;
    fetchDevices(rmnUser.uuid).then((result) => {
      setDevices(result?.devices ?? []);
    });
  }, [rmnUser?.uuid, fetchDevices]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteRequest = (hwid: string) => {
    setDeviceToDelete(hwid);
    confirmState.open();
  };

  const handleConfirmDelete = async () => {
    if (!rmnUser?.uuid || !deviceToDelete) return;
    const result = await deleteDevice(rmnUser.uuid, deviceToDelete);
    if (result) {
      setDevices(result.devices);
    }
    setDeviceToDelete(null);
  };

  return (
    <Page
      icon={<DevicePageIcon />}
      title={t('devices.pageTitle')}
      subtitle={t('devices.pageSubtitle')}
    >
      <div className='flex w-full flex-col gap-2'>
        <h2 className='px-4 text-xs font-semibold tracking-[0.06em] text-muted uppercase'>
          {t('devices.listHeading')}
        </h2>

        <Card className='w-full overflow-hidden p-0' variant='secondary'>
          <Card.Content className='flex flex-col gap-0 p-0'>
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
                  onDeleteRequest={handleDeleteRequest}
                />
              ))
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Deletion confirmation dialog */}
      <AlertDialog.Backdrop
        isDismissable
        isOpen={confirmState.isOpen}
        variant='blur'
        onOpenChange={confirmState.setOpen}
      >
        <AlertDialog.Container size='sm'>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status='danger' />
              <AlertDialog.Heading>{t('devices.deleteDevice.title')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className='text-sm text-muted'>{t('devices.deleteDevice.body')}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot='close' variant='tertiary'>
                {t('devices.deleteDevice.cancel')}
              </Button>
              <Button slot='close' variant='danger' onPress={handleConfirmDelete}>
                {t('devices.deleteDevice.confirm')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}
