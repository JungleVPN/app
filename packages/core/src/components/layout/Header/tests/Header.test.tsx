import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlatformStore } from '../../../../stores';
import { Header } from '../Header';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@workspace/core', () => ({
  useAuthStore: () => ({ authUser: null, tgUser: null }),
}));

vi.mock('../../../../api', () => ({
  useRemnawaveApi: () => ({ getMyTelegramPhoto: vi.fn() }),
}));

vi.mock('../../../../hooks', () => ({ useTheme: () => ({ theme: 'light' }) }));

vi.mock('../../../../ui', () => ({
  Container: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('../../../../assets/Logo_dark.svg?react', () => ({
  default: () => <svg aria-hidden />,
}));

vi.mock('../AuthButtons', () => ({ AuthButtons: () => null }));
vi.mock('../LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('../MobileDrawer', () => ({ MobileDrawer: () => null }));
vi.mock('../OfferMenu', () => ({ OfferMenu: () => null }));
vi.mock('../ToolsMenu', () => ({ ToolsMenu: () => null }));
vi.mock('../../../subscription/SubscriptionLinkWidget/SubscriptionLinkWidget', () => ({
  SubscriptionLinkWidget: () => null,
}));
vi.mock('../../SupportWidget/SupportButton', () => ({ SupportButton: () => null }));
vi.mock('../../../common/IpStatusBar/IpStatusBar', () => ({ IpStatusBar: () => null }));

function renderWebHeader(path = '/pricing') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
  const bar = screen.getByRole('banner').parentElement;
  if (!bar) throw new Error('header has no wrapper');
  return bar;
}

describe('Header on the web', () => {
  beforeEach(() => {
    usePlatformStore.setState({ platformType: 'web', isMobileTma: false });
    Object.assign(window, { scrollY: 0 });
  });

  it('spans the full width without a shadow at the top of the page', () => {
    const bar = renderWebHeader();

    expect(bar.classList.contains('w-full')).toBe(true);
    expect(bar.classList.contains('shadow-none')).toBe(true);
  });

  it('casts a shadow once the page is scrolled', () => {
    const bar = renderWebHeader();

    act(() => {
      Object.assign(window, { scrollY: 120 });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(bar.classList.contains('shadow-lg')).toBe(true);
    expect(bar.classList.contains('shadow-none')).toBe(false);
  });

  it('is transparent with a white logo title over the landing hero', () => {
    const bar = renderWebHeader('/');

    expect(bar.classList.contains('bg-transparent')).toBe(true);
    expect(bar.classList.contains('bg-white')).toBe(false);
    expect(screen.getByText('JungleVPN').classList.contains('text-white')).toBe(true);
  });

  it('turns white with a dark logo title once the landing page is scrolled', () => {
    const bar = renderWebHeader('/');

    act(() => {
      Object.assign(window, { scrollY: 120 });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(bar.classList.contains('bg-white')).toBe(true);
    expect(bar.classList.contains('bg-transparent')).toBe(false);
    expect(screen.getByText('JungleVPN').classList.contains('text-white')).toBe(false);
  });

  it('stays white on pages without the landing hero', () => {
    const bar = renderWebHeader('/pricing');

    expect(bar.classList.contains('bg-white')).toBe(true);
    expect(screen.getByText('JungleVPN').classList.contains('text-white')).toBe(false);
  });
});
