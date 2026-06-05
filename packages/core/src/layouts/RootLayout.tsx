import { ScrollShadow, Surface } from '@heroui/react';
import { Outlet } from 'react-router';
import { ErrorBoundary, Header } from '../components';
import { usePlatformStore } from '../stores';

export function RootLayout() {
  const { platformType, clientPlatform } = usePlatformStore();
  const isMobileTma =
    platformType === 'telegram' && (clientPlatform === 'ios' || clientPlatform === 'android');

  return (
    <ErrorBoundary>
      <Surface
        variant='transparent'
        className='mx-auto flex h-dvh w-full max-w-xl flex-col px-6'
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
