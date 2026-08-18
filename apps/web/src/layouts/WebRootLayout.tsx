import { Container, RootLayout } from '@workspace/core';

export function WebRootLayout() {
  return (
    <Container maxWidth={'sm'} className={'mt-16'}>
      <RootLayout />
    </Container>
  );
}
