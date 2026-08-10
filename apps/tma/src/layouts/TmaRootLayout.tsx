import { RootLayout } from '@workspace/core';
import { Header, ScrollShadowComponent } from '@workspace/core/components';
import { TmaAuthProvider } from '@/providers/TmaAuthProvider.tsx';
import { TmaProvider } from '@/providers/TmaProvider.tsx';

export function TmaRootLayout() {
  return (
    <TmaAuthProvider>
      <TmaProvider>
        <Header />
        <ScrollShadowComponent className='flex-1 overflow-y-auto' hideScrollBar>
          <RootLayout />
        </ScrollShadowComponent>
      </TmaProvider>
    </TmaAuthProvider>
  );
}
