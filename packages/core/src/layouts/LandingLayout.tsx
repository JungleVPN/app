import { Outlet } from 'react-router';
import { ErrorBoundary, Header } from '../components';

export function LandingLayout() {
  return (
    <ErrorBoundary>
      <div className='flex h-screen flex-col'>
        <div className='shrink-0 py-4 px-8'>
          <Header />
        </div>
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
