import { RootLayout, usePlatformStore } from '@workspace/core';
import { TmaAuthProvider } from '@/providers/TmaAuthProvider.tsx';
import { TmaProvider } from '@/providers/TmaProvider.tsx';

export function TmaRootLayout() {
  const { clientPlatform, platformType } = usePlatformStore();
  return (
    <TmaAuthProvider>
      <TmaProvider>
        <div
          className={`${platformType === 'telegram' && (clientPlatform === 'ios' || clientPlatform === 'android') ? 'pt-24' : ''}`}
        >
          <RootLayout />
        </div>
      </TmaProvider>
    </TmaAuthProvider>
  );
}
