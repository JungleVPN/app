import { cleanup, render, waitFor } from '@testing-library/react';
import type { GetUserByIdResponseDto } from '@workspace/types';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, usePlatformStore } from '../stores';
import { ProfileLayout } from './ProfileLayout';

const { getMe, phIdentify, navigate, remnawaveApi, currentScope } = vi.hoisted(() => {
  const getMe = vi.fn();
  const remnawaveApi = {
    getMe,
    getMyMetadata: vi.fn().mockResolvedValue(null),
    upsertMyMetadata: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getMe,
    phIdentify: vi.fn(),
    navigate: vi.fn(),
    remnawaveApi,
    currentScope: vi.fn(),
  };
});

vi.mock('../api', () => ({
  useRemnawaveApi: () => remnawaveApi,
}));

vi.mock('../runtime', () => ({
  useAppRoutes: () => ({ getConnectEmailPath: '/connectEmail', publicPlansPath: '/plans' }),
  usePaymentsApi: () => ({}),
}));

vi.mock('../hooks', () => ({
  useNavigation: () => navigate,
  useSavedMethodsData: () => undefined,
  useSubscriptionData: () => undefined,
  useToltCapture: () => undefined,
}));

vi.mock('../ui', () => ({
  Container: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('../components', () => ({ Navbar: () => null }));
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

function renderProfileLayout() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path={'/profile'} element={<ProfileLayout />} />
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

  afterEach(cleanup);

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
});
