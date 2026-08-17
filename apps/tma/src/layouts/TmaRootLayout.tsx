import { RootLayout } from '@workspace/core';
import { Header, ScrollShadowComponent } from '@workspace/core/components';
import { TmaAuthProvider } from '@/providers/TmaAuthProvider.tsx';
import { TmaProvider } from '@/providers/TmaProvider.tsx';

export function TmaRootLayout() {
  return (
    <TmaAuthProvider>
      <TmaProvider>
        <ScrollShadowComponent hideScrollBar>
          <Header />
          <RootLayout />
        </ScrollShadowComponent>
      </TmaProvider>
    </TmaAuthProvider>
  );
}
