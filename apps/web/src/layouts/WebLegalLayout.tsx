import { Container, usePlatformStore } from '@workspace/core';
import { FooterSection } from '@workspace/core/components';
import { useScrollToTopOnNavigate } from '@workspace/core/hooks';
import { Outlet } from 'react-router';

export function WebLegalLayout() {
  const { platformType } = usePlatformStore();
  useScrollToTopOnNavigate();

  return (
    <Container maxWidth={'md'}>
      <div className={`${platformType === 'web' ? 'pt-32 pb-22' : 'pt-4 pb-22'}`}>
        <Outlet />
      </div>
      <FooterSection />
    </Container>
  );
}
