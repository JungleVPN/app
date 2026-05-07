import { Outlet } from 'react-router';
import { ErrorBoundary, Header } from '../components';
import { AppContainer } from '../ui';

export function RootLayout() {
  return (
    <ErrorBoundary>
      <AppContainer>
        <Header />
        <div className='pt-10 pb-16'>
          <Outlet />
        </div>
      </AppContainer>
    </ErrorBoundary>
  );
}
