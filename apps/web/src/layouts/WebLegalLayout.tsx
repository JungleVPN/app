import { Container } from '@workspace/core';
import { FooterSection } from '@workspace/core/components';
import { Outlet } from 'react-router';

export function WebLegalLayout() {
  return (
    <Container maxWidth={'md'}>
      <div className={'my-16'}>
        <Outlet />
      </div>
      <FooterSection />
    </Container>
  );
}
