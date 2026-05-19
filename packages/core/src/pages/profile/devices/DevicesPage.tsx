import { Card, Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import deviceAnimation from '../../../assets/lottie/devicesPageIcon.lottie?url';
import { LottieIcon, Page } from '../../../ui';
import { DeviceDeleteDialog } from './components/DeviceDeleteDialog';
import { DeviceRow } from './components/DeviceRow';
import { useDevices } from './hooks/useDevices';

export default function DevicesPage() {
  const { t } = useTranslation();
  const {
    devices,
    isFetching,
    isDeleting,
    confirmIsOpen,
    confirmSetOpen,
    handleDeleteRequest,
    handleConfirmDelete,
  } = useDevices();

  return (
    <Page
      icon={<LottieIcon src={deviceAnimation} />}
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

      <DeviceDeleteDialog
        isOpen={confirmIsOpen}
        onOpenChange={confirmSetOpen}
        onConfirm={handleConfirmDelete}
      />
    </Page>
  );
}
