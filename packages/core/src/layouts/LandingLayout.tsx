import { Outlet } from 'react-router';
import { ErrorBoundary, FooterSection, StickyFooterReveal } from '../components';
import { useScrollToTopOnNavigate } from '../hooks';
import { Container } from '../ui';

export function LandingLayout() {
  useScrollToTopOnNavigate();

  return (
    <ErrorBoundary>
      <Outlet />

      {/* The footer belongs to the marketing surface as a whole — landing,
          pricing and referrals all reveal the same one, so it lives here
          rather than at the bottom of each page. */}
      <div className='relative z-10 bg-[#1a1a1a]'>
        <StickyFooterReveal>
          <Container className='-mt-20 pt-20'>
            <FooterSection />
          </Container>
        </StickyFooterReveal>
      </div>
    </ErrorBoundary>
  );
}
