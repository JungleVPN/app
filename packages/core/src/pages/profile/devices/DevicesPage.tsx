import { useTranslation } from 'react-i18next';
import deviceAnimation from '../../../assets/lottie/devicesPageIcon.lottie?url';
import { LottieIcon, Page } from '../../../ui';
import { DevicesList } from './components/DevicesList';
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
      <DevicesList
        devices={devices}
        isFetching={isFetching}
        isDeleting={isDeleting}
        confirmIsOpen={confirmIsOpen}
        confirmSetOpen={confirmSetOpen}
        onDeleteRequest={handleDeleteRequest}
        onConfirmDelete={handleConfirmDelete}
      />
    </Page>
  );
}
