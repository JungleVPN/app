import { RootLayout, useAuthStore } from '@workspace/core';
import { Header, ScrollShadowComponent, SessionExpired } from '@workspace/core/components';
import { TmaAuthProvider } from '@/providers/TmaAuthProvider.tsx';
import { TmaProvider } from '@/providers/TmaProvider.tsx';

export function TmaRootLayout() {
  const sessionExpired = useAuthStore((state) => state.sessionExpired);

  return (
    <TmaAuthProvider>
      <TmaProvider>
        <ScrollShadowComponent hideScrollBar>
          <Header />
          {sessionExpired ? <SessionExpired /> : <RootLayout />}
        </ScrollShadowComponent>
      </TmaProvider>
    </TmaAuthProvider>
  );
}
