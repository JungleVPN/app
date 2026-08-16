import { Outlet } from 'react-router';
import { ErrorBoundary } from '../components';

export function LandingLayout() {
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}
