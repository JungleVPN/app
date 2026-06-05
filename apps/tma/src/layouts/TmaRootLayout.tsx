import { RootLayout } from '@workspace/core';
import { TmaAuthProvider } from '@/providers/TmaAuthProvider.tsx';
import { TmaProvider } from '@/providers/TmaProvider.tsx';

export function TmaRootLayout() {
  return (
    <TmaAuthProvider>
      <TmaProvider>
        <RootLayout />
      </TmaProvider>
    </TmaAuthProvider>
  );
}
