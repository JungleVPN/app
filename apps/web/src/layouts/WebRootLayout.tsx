import { Container, RootLayout } from '@workspace/core';
import { useEffect } from 'react';

export function WebRootLayout() {
  useEffect(() => {
    document.documentElement.classList.add('scroll-lock');
    return () => document.documentElement.classList.remove('scroll-lock');
  }, []);

  return (
    <Container maxWidth={'sm'} className={'mt-16'}>
      <RootLayout />
    </Container>
  );
}
