import { useTranslation } from 'react-i18next';
import deviceAnimation from '../../../assets/lottie/devicesPageIcon.lottie?url';
import { LottieIcon, Page } from '../../../ui';
import { DevicesList } from './components/DevicesList';
import { ExtraDeviceBlock } from './components/ExtraDeviceBlock';
import { useDevices } from './hooks/useDevices';

export default function DevicesPage() {
  const { t } = useTranslation();
  const {
    devices,
    isFetching,
    isDeleting,
    deviceCount,
    deviceLimit,
    confirmIsOpen,
    confirmSetOpen,
    handleDeleteRequest,
    handleConfirmDelete,
  } = useDevices();

  const titleBadge =
    deviceCount !== null && deviceLimit !== null ? `${deviceCount} / ${deviceLimit}` : undefined;

  return (
    <Page
      icon={<LottieIcon src={deviceAnimation} />}
      title={t('devices.pageTitle')}
      subtitle={t('devices.pageSubtitle')}
    >
      <ExtraDeviceBlock />
      <DevicesList
        devices={devices}
        isFetching={isFetching}
        isDeleting={isDeleting}
        titleBadge={titleBadge}
        confirmIsOpen={confirmIsOpen}
        confirmSetOpen={confirmSetOpen}
        onDeleteRequest={handleDeleteRequest}
        onConfirmDelete={handleConfirmDelete}
      />
    </Page>
  );
}
