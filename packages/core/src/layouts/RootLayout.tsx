import { Outlet } from 'react-router';
import { ErrorBoundary, Header } from '../components';
import { AppContainer } from '../ui';

export function RootLayout() {
  return (
    <ErrorBoundary>
      <AppContainer>
        <Header />
        <div className='pt-8 pb-20'>
          <Outlet />
        </div>
      </AppContainer>
    </ErrorBoundary>
  );
}
