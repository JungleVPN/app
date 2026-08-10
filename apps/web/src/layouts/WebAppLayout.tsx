import { usePlatformStoreActions } from '@workspace/core';
import { Header } from '@workspace/core/components';
import { useEffect } from 'react';
import { Outlet } from 'react-router';

export function WebAppLayout() {
  const { setPlatformType } = usePlatformStoreActions();

  useEffect(() => {
    setPlatformType('web');
  }, [setPlatformType]);

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
