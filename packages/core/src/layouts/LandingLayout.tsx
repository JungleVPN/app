import { Outlet } from 'react-router';
import { ErrorBoundary } from '../components';
import { LandingContainer } from '../ui';

export function LandingLayout() {
  return (
    <ErrorBoundary>
      <LandingContainer>
        <Outlet />
      </LandingContainer>
    </ErrorBoundary>
  );
}
