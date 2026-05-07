import { RootLayout, usePlatformStoreActions } from '@workspace/core';
import { useEffect } from 'react';

export function WebRootLayout() {
  const { setPlatformType } = usePlatformStoreActions();
  useEffect(() => {
    setPlatformType('web');
  }, [setPlatformType]);
  return <RootLayout />;
}
