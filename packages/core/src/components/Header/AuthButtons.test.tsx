import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores';
import { AuthButtons } from './AuthButtons';

const { navigate, pathname, scrollIntoView } = vi.hoisted(() => ({
  navigate: vi.fn(),
  pathname: { current: '/' },
  scrollIntoView: vi.fn(),
}));

vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: pathname.current }),
}));

vi.mock('../../hooks', () => ({ useNavigation: () => navigate }));

vi.mock('../../runtime', () => ({
  useSupabaseClient: () => ({ auth: { signOut: vi.fn() } }),
  useAppRoutes: () => ({ publicPlansPath: '/plans' }),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function setAuthState() {
  useAuthStore.setState({ authUser: null, rmnUser: null, tgUser: null, loading: false });
}

function pricingSection() {
  const section = document.createElement('div');
  section.id = 'pricing';
  section.scrollIntoView = scrollIntoView;
  document.body.append(section);
  return section;
}

describe('AuthButtons "try now"', () => {
  beforeEach(() => {
    setAuthState();
    pathname.current = '/';
    document.getElementById('pricing')?.remove();
  });

  it('scrolls a global visitor to the pricing section when it is on the page', () => {
    pricingSection();

    render(<AuthButtons isRu={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'header.cta' }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends a global visitor to the plan picker from a page that has no pricing section', () => {
    pathname.current = '/payment/plan12';

    render(<AuthButtons isRu={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'header.cta' }));

    expect(navigate).toHaveBeenCalledWith('/plans');
  });

  it('sends a RU visitor to log in, where the trial account is created', () => {
    render(<AuthButtons isRu />);
    fireEvent.click(screen.getByRole('button', { name: 'header.cta' }));

    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
