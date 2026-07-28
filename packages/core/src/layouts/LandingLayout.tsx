import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { ErrorBoundary, Header } from '../components';

export function LandingLayout() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const onScroll = () => setScrolled(root.scrollTop > 0);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <ErrorBoundary>
      <div className='flex flex-col'>
        <div className='sticky top-0 z-50 shrink-0 py-3'>
          <div
            className={`max-w-200 mx-auto px-4 py-2 transition-all duration-300 ${
              scrolled ? 'shadow-lg backdrop-blur-md bg-background/80 rounded-2xl' : ''
            }`}
          >
            <Header />
          </div>
        </div>
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
