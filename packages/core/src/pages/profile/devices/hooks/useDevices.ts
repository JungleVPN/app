import { useOverlayState } from '@heroui/react';
import {
  useAuthStoreInfo,
  useDeleteDevice,
  useRemnawaveApi,
  useUserDevices,
} from '@workspace/core';
import type { HwidDeviceDto } from '@workspace/types';
import { useEffect, useMemo, useState } from 'react';

export function useDevices() {
  const remnawaveApi = useRemnawaveApi();
  const { rmnUser } = useAuthStoreInfo();

  const [devices, setDevices] = useState<HwidDeviceDto[] | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const confirmState = useOverlayState();

  const { isLoading: isFetching, execute: fetchDevices } = useUserDevices(remnawaveApi);
  const { isLoading: isDeleting, execute: deleteDevice } = useDeleteDevice(remnawaveApi);

  useEffect(() => {
    if (!rmnUser?.id) return;
    fetchDevices().then((result) => {
      setDevices(result?.devices ?? []);
    });
  }, [rmnUser?.id, fetchDevices]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteRequest = (hwid: string) => {
    setDeviceToDelete(hwid);
    confirmState.open();
  };

  const handleConfirmDelete = async () => {
    if (!deviceToDelete) return;
    const result = await deleteDevice(deviceToDelete);
    if (result) setDevices(result.devices);
    setDeviceToDelete(null);
  };

  const isAtLimit = useMemo(() => {
    if (devices === null || rmnUser?.hwidDeviceLimit == null) return false;
    return devices.length >= rmnUser.hwidDeviceLimit;
  }, [devices, rmnUser?.hwidDeviceLimit]);

  const deviceCount = devices?.length ?? null;
  const deviceLimit = rmnUser?.hwidDeviceLimit ?? null;

  return {
    devices,
    isFetching,
    isDeleting,
    isAtLimit,
    deviceCount,
    deviceLimit,
    confirmIsOpen: confirmState.isOpen,
    confirmSetOpen: confirmState.setOpen,
    handleDeleteRequest,
    handleConfirmDelete,
  };
}
