import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackButton } from '../hooks/useBackButton';
import { type PlatformType, useBackButtonStore, usePlatformStore } from '../stores';
import { BackButton } from './BackButton';

vi.mock('@tma.js/sdk-react', () => ({
  backButton: {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
  },
}));

interface HarnessOptions {
  platformType?: PlatformType;
  path?: string;
  withBackButton?: boolean;
  onBack?: () => void;
}

/** Mirrors TransactionsPage: registers the hook, renders BackButton standalone. */
function renderHarness(options: HarnessOptions = {}) {
  const { platformType = 'web', path = '/profile/transactions', withBackButton = true } = options;

  usePlatformStore.setState({ platformType });

  function LocationProbe() {
    const { pathname } = useLocation();
    return <span data-testid={'pathname'}>{pathname}</span>;
  }

  function TestPage() {
    if (withBackButton) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useBackButton(options.onBack);
    }
    return <BackButton />;
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path={'*'} element={<TestPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const backButton = () => screen.queryByRole('button', { name: /back/i });

describe('BackButton', () => {
  beforeEach(() => {
    useBackButtonStore.setState({ onBack: null });
    usePlatformStore.setState({ platformType: null });
  });

  it('renders on a profile page that configures useBackButton', () => {
    renderHarness();

    expect(backButton()).toBeTruthy();
  });

  it('renders nothing when no page configured useBackButton', () => {
    renderHarness({ withBackButton: false });

    expect(backButton()).toBeNull();
  });

  it('renders outside the profile area too, as long as the page configures useBackButton', () => {
    renderHarness({ path: '/terms' });

    expect(backButton()).toBeTruthy();
  });

  it('renders nothing on Telegram, where the native button is used', () => {
    renderHarness({ platformType: 'telegram' });

    expect(backButton()).toBeNull();
  });

  it('runs the configured handler when clicked', () => {
    const onBack = vi.fn();
    renderHarness({ onBack });

    act(() => backButton()?.click());

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to the parent path when no custom handler is configured', () => {
    renderHarness();

    act(() => backButton()?.click());

    expect(screen.getByTestId('pathname').textContent).toBe('/profile');
  });
});
