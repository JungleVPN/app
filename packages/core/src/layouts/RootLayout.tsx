import { Surface } from '@heroui/react';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { AppAlert, ErrorBoundary } from '../components';
import { usePlatformStore } from '../stores';
import { ProfileContainer } from '../ui/containers/ProfileContainer';

export function RootLayout() {
  const {
    platformType,
    clientPlatform,
    actions: { setIsMobileTma },
  } = usePlatformStore();

  useEffect(() => {
    setIsMobileTma(
      platformType === 'telegram' && (clientPlatform === 'ios' || clientPlatform === 'android'),
    );
  }, [clientPlatform, platformType, setIsMobileTma]);

  return (
    <ErrorBoundary>
      <AppAlert />
      <ProfileContainer>
        <Surface variant='transparent' className='flex flex-col w-full'>
          <Outlet />
        </Surface>
      </ProfileContainer>
    </ErrorBoundary>
  );
}
