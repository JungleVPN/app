import { usePaymentsApi, usePlatformStoreActions, useToltLanding } from '@workspace/core';
import { Header } from '@workspace/core/components';
import { useEffect } from 'react';
import { Outlet } from 'react-router';

export function WebAppLayout() {
  const { setPlatformType } = usePlatformStoreActions();

  const paymentsApi = usePaymentsApi();

  // Records the click and stores the partner whenever a visitor lands on an
  // `?aff=` link. Runs above auth because attribution has to be captured before
  // the visitor has an account.
  useToltLanding(paymentsApi);

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
