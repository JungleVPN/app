import { Outlet, useLocation } from 'react-router';
import { ErrorBoundary, FooterSection, StickyFooterReveal } from '../components';
import { SectionReachedMarker } from '../components/marketing/SectionTracking/SectionTracking';
import { useScrollToTopOnNavigate } from '../hooks';
import { isLandingPath } from '../utils';

export function LandingLayout() {
  useScrollToTopOnNavigate();
  const { pathname } = useLocation();

  return (
    <ErrorBoundary>
      <div className='relative bg-[#1a1a1a]'>
        <div className='relative z-10'>
          <Outlet />
          <SectionReachedMarker section='footer' enabled={isLandingPath(pathname)} />
        </div>

        <StickyFooterReveal>
          <FooterSection />
        </StickyFooterReveal>
      </div>
    </ErrorBoundary>
  );
}
