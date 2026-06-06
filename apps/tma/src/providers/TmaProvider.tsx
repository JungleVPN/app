import { retrieveLaunchParams } from '@tma.js/sdk-react';
import { usePlatformStoreActions } from '@workspace/core';
import { type ReactNode, useEffect, useMemo } from 'react';

/**
 * Shell init (`initTma`) runs once in `main.tsx` before React mounts.
 * Here we only read launch params and mirror them into the shared platform store.
 */
export function TmaProvider({ children }: { children: ReactNode }) {
  const { setClientPlatform, setPlatformType } = usePlatformStoreActions();

  const launchParams = useMemo(() => retrieveLaunchParams(), []);

  useEffect(() => {
    setClientPlatform(launchParams.tgWebAppPlatform);
    setPlatformType('telegram');
  }, [launchParams.tgWebAppPlatform, setClientPlatform, setPlatformType]);

  return <>{children}</>;
}
