import { Outlet, useLocation } from 'react-router';
import { ErrorBoundary, FooterSection } from '../components';
import { SectionReachedMarker } from '../components/marketing/SectionTracking/SectionTracking';
import { useScrollToTopOnNavigate } from '../hooks';
import { isLandingPath } from '../utils';

export function LandingLayout() {
  useScrollToTopOnNavigate();
  const { pathname } = useLocation();

  return (
    <ErrorBoundary>
      <div className='relative bg-[#0b0b0b]'>
        <div className='relative z-10'>
          <Outlet />
          <SectionReachedMarker section='footer' enabled={isLandingPath(pathname)} />
        </div>

        {/*<StickyFooterReveal>*/}
        <FooterSection />
        {/*</StickyFooterReveal>*/}
      </div>
    </ErrorBoundary>
  );
}
