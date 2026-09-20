import {
  isMarketingPath,
  usePaymentsApi,
  usePlatformStoreActions,
  useToltLanding,
} from '@workspace/core';
import { CookieConsent, Header, IpStatusBar } from '@workspace/core/components';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

export function WebAppLayout() {
  const { setPlatformType } = usePlatformStoreActions();
  const { pathname } = useLocation();

  const paymentsApi = usePaymentsApi();

  const isLanding = isMarketingPath(pathname);

  // Records the click and stores the partner whenever a visitor lands on an
  // `?aff=` link. Runs above auth because attribution has to be captured before
  // the visitor has an account.
  useToltLanding(paymentsApi);

  useEffect(() => {
    setPlatformType('web');
  }, [setPlatformType]);

  return (
    <>
      {isLanding && <IpStatusBar />}
      <Header />
      <Outlet />
      <CookieConsent />
    </>
  );
}
