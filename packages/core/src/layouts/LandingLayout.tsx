import { Outlet } from 'react-router';
import { ErrorBoundary, FooterSection, StickyFooterReveal } from '../components';
import { useScrollToTopOnNavigate } from '../hooks';

export function LandingLayout() {
  useScrollToTopOnNavigate();

  return (
    <ErrorBoundary>
      <div className='relative bg-[#1a1a1a]'>
        <div className='relative z-10'>
          <Outlet />
        </div>

        <StickyFooterReveal>
          <FooterSection />
        </StickyFooterReveal>
      </div>
    </ErrorBoundary>
  );
}
