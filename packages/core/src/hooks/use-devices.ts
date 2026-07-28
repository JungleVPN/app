import { useCallback } from 'react';
import type { createRemnawaveApi } from '../api';
import { useAsync } from './use-async';

type RemnawaveApi = ReturnType<typeof createRemnawaveApi>;

export function useUserDevices(api: RemnawaveApi) {
  const fn = useCallback(() => api.getMyDevices(), [api]);
  return useAsync(fn);
}

export function useDeleteDevice(api: RemnawaveApi) {
  const fn = useCallback((hwid: string) => api.deleteMyDevice(hwid), [api]);
  return useAsync(fn);
}
