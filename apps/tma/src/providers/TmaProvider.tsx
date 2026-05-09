import { backButton, retrieveLaunchParams } from '@tma.js/sdk-react';
import { usePlatformStoreActions } from '@workspace/core';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Shell init (`initTma`) runs once in `main.tsx` before React mounts.
 * Here we only read launch params and mirror them into the shared platform store.
 */
export function TmaProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setClientPlatform, setPlatformType } = usePlatformStoreActions();

  const launchParams = useMemo(() => retrieveLaunchParams(), []);

  useEffect(() => {
    setClientPlatform(launchParams.tgWebAppPlatform);
    setPlatformType('telegram');
  }, [launchParams.tgWebAppPlatform, setClientPlatform, setPlatformType]);

  useEffect(() => {
    if (!location.pathname.includes('profile')) {
      backButton.show();
    } else {
      backButton.hide();
    }
  }, [location.pathname]);

  useEffect(() => {
    backButton.onClick(() => navigate(-1));
  }, [navigate]);

  return <>{children}</>;
}
