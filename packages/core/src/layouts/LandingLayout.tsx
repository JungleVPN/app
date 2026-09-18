import { Outlet } from 'react-router';
import { ErrorBoundary } from '../components';
import { useScrollToTopOnNavigate } from '../hooks';

export function LandingLayout() {
  useScrollToTopOnNavigate();

  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}
