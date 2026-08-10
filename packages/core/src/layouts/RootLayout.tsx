import { ScrollShadow, Surface } from '@heroui/react';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { AppAlert, ErrorBoundary, Header } from '../components';
import { usePlatformStore } from '../stores';

export function RootLayout() {
  const {
    platformType,
    clientPlatform,
    isMobileTma,
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
      <Surface
        variant='transparent'
        className='flex h-dvh w-full max-w-xl flex-col px-6'
        style={isMobileTma ? { paddingTop: '6rem' } : undefined}
      >
        <ScrollShadow className='flex-1 overflow-y-auto' hideScrollBar>
          <div className='shrink-0 py-4'>
            <Header />
          </div>
          <div className='pt-4 pb-24'>
            <Outlet />
          </div>
        </ScrollShadow>
      </Surface>
    </ErrorBoundary>
  );
}
