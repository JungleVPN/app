import { useCallback } from 'react';
import type { createRemnawaveApi } from '../api';
import { useAsync } from './use-async';

type RemnawaveApi = ReturnType<typeof createRemnawaveApi>;

export function useUserDevices(api: RemnawaveApi) {
  const fn = useCallback((userUuid: string) => api.getUserDevices(userUuid), [api]);
  return useAsync(fn);
}

export function useDeleteDevice(api: RemnawaveApi) {
  const fn = useCallback(
    (userUuid: string, hwid: string) => api.deleteUserDevice(userUuid, hwid),
    [api],
  );
  return useAsync(fn);
}
