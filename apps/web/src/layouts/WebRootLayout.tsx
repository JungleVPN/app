import { Container, RootLayout, usePlatformStore } from '@workspace/core';
import { useEffect } from 'react';

export function WebRootLayout() {
  const { platformType } = usePlatformStore();

  useEffect(() => {
    document.documentElement.classList.add('scroll-lock');
    return () => document.documentElement.classList.remove('scroll-lock');
  }, []);

  return (
    <Container
      maxWidth={'sm'}
      className={`${platformType === 'web' ? 'pt-32 pb-22' : 'pt-4 pb-22'} mt-16`}
    >
      <RootLayout />
    </Container>
  );
}
