import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GetUserByIdResponseDto } from '@workspace/types';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionLoad } from '../hooks';
import { useAuthStore, usePlatformStore } from '../stores';
import { ProfileLayout } from './ProfileLayout';

const {
  getMe,
  analyticsApi,
  phIdentify,
  navigate,
  remnawaveApi,
  currentScope,
  trackTmaOpened,
  subscriptionLoad,
} = vi.hoisted(() => {
  const getMe = vi.fn();
  const remnawaveApi = {
    getMe,
    getMyMetadata: vi.fn().mockResolvedValue(null),
    upsertMyMetadata: vi.fn().mockResolvedValue(undefined),
  };
  const trackTmaOpened = vi.fn();
  return {
    getMe,
    analyticsApi: { trackTmaOpened },
    phIdentify: vi.fn(),
    navigate: vi.fn(),
    remnawaveApi,
    currentScope: vi.fn(),
    trackTmaOpened,
    subscriptionLoad: { error: null, retry: vi.fn() } as SubscriptionLoad,
  };
});

vi.mock('../api', () => ({
  useRemnawaveApi: () => remnawaveApi,
  useAnalyticsApi: () => analyticsApi,
}));

vi.mock('../runtime', () => ({
  useAppRoutes: () => ({ getConnectEmailPath: '/connectEmail', publicPlansPath: '/plans' }),
  usePaymentsApi: () => ({}),
}));

vi.mock('../hooks', () => ({
  useNavigation: () => navigate,
  useSavedMethodsData: () => undefined,
  useSubscriptionData: () => subscriptionLoad,
  useToltCapture: () => undefined,
}));

vi.mock('../ui', () => ({
  Container: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('../components', () => ({
  Navbar: () => null,
  LoadError: ({ reason, onRetry }: { reason: string; onRetry: () => void }) => (
    <button type='button' data-reason={reason} onClick={onRetry}>
      retry
    </button>
  ),
}));
vi.mock('../components/SubscriptionLinkWidget/SubscriptionLinkDialog', () => ({
  SubscriptionLinkDialog: () => null,
}));
vi.mock('../pages/profile/payment/components/TermsDialog', () => ({ TermsDialog: () => null }));
vi.mock('../core/i18n', () => ({ applyUserLang: vi.fn() }));
vi.mock('../env', () => ({ coreEnv: { subpageConfigUuid: 'test-subpage' } }));

vi.mock('../utils', () => ({ captureReferral: vi.fn(), phIdentify, currentScope }));

function fakeUser(overrides: Partial<GetUserByIdResponseDto> = {}) {
  return { id: 846, shortUuid: 'sub-846', ...overrides } as GetUserByIdResponseDto;
}

function ProfilePage() {
  const load = useOutletContext<SubscriptionLoad>();
  return (
    <p>{load === subscriptionLoad ? 'profile page' : 'profile page without subscription load'}</p>
  );
}

function renderProfileLayout() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path={'/profile'} element={<ProfileLayout />}>
          <Route index element={<ProfilePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProfileLayout', () => {
  beforeEach(() => {
    currentScope.mockReturnValue('ru');
    usePlatformStore.setState({ platformType: 'web' });
    remnawaveApi.getMyMetadata.mockResolvedValue(null);
    remnawaveApi.upsertMyMetadata.mockResolvedValue(undefined);
    useAuthStore.setState({
      authUser: { id: 'auth-1', email: 'user@test.com' },
      rmnUser: null,
      loading: true,
      authSource: null,
      tgUser: null,
      tgInitDataRaw: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('identifies the confirmed-login user to PostHog by their canonical userId', async () => {
    getMe.mockResolvedValue(fakeUser({ id: 846 }));

    renderProfileLayout();

    await waitFor(() => expect(phIdentify).toHaveBeenCalledWith('846'));
  });

  it('does not identify when no remnawave user is found for the auth identity', async () => {
    getMe.mockResolvedValue(null);

    renderProfileLayout();

    await waitFor(() => expect(getMe).toHaveBeenCalled());

    expect(phIdentify).not.toHaveBeenCalled();
  });

  // The trial is a Telegram-only offer: only the Mini App creates an account up
  // front, and the panel opens it with TRIAL_PERIOD_IN_DAYS of access.
  it('sends a TMA user with no remnawave account to the page that creates their trial account', async () => {
    usePlatformStore.setState({ platformType: 'telegram' });
    getMe.mockResolvedValue(null);

    renderProfileLayout();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/connectEmail'));
  });

  it('navigates a web user with no remnawave account to the plans page', async () => {
    getMe.mockResolvedValue(null);

    renderProfileLayout();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/plans'));
  });

  // A failed lookup used to be logged and nothing else, leaving every profile
  // page on a spinner with no navbar and no way out.
  describe('when the account cannot be loaded', () => {
    it('offers a retry instead of the page', async () => {
      getMe.mockRejectedValue(new Error('network down'));

      renderProfileLayout();

      expect(await screen.findByRole('button', { name: 'retry' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'retry' }).getAttribute('data-reason')).toBe(
        'could_not_get_account_data',
      );
      expect(screen.queryByText('profile page')).toBeNull();
    });

    it('loads the account again and shows the page once retrying succeeds', async () => {
      getMe.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(fakeUser());
      renderProfileLayout();

      fireEvent.click(await screen.findByRole('button', { name: 'retry' }));

      expect(await screen.findByText('profile page')).toBeTruthy();
      expect(getMe).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('button', { name: 'retry' })).toBeNull();
    });
  });

  // The subscription page shows the loader's failure; the layout owns the
  // loader, so it hands the result down to whichever page is open.
  it("gives the open page the subscription loader's result", async () => {
    getMe.mockResolvedValue(fakeUser());

    renderProfileLayout();

    expect(await screen.findByText('profile page')).toBeTruthy();
  });

  // tma_opened carries the account once it is known, so the backend can tie the
  // Telegram identity (bot_started, earlier opens) to the user's payments.
  describe('mini app open', () => {
    const openInTelegram = () => {
      usePlatformStore.setState({ platformType: 'telegram' });
      useAuthStore.setState({ authUser: null, tgUser: { id: 777 } as never });
    };

    it('reports the open with the account the Telegram user already has', async () => {
      openInTelegram();
      getMe.mockResolvedValue(fakeUser({ id: 846, email: 'tg@test.com' }));

      renderProfileLayout();

      await waitFor(() =>
        expect(trackTmaOpened).toHaveBeenCalledWith({
          telegramId: 777,
          userId: 846,
          email: 'tg@test.com',
        }),
      );
      expect(trackTmaOpened).toHaveBeenCalledTimes(1);
    });

    it('reports the open without an account for a first-time Telegram user', async () => {
      openInTelegram();
      getMe.mockResolvedValue(null);

      renderProfileLayout();

      await waitFor(() =>
        expect(trackTmaOpened).toHaveBeenCalledWith({ telegramId: 777, userId: null, email: null }),
      );
    });

    it('reports no mini app open on the web', async () => {
      getMe.mockResolvedValue(fakeUser());

      renderProfileLayout();
      await waitFor(() => expect(phIdentify).toHaveBeenCalled());

      expect(trackTmaOpened).not.toHaveBeenCalled();
    });
  });
});
