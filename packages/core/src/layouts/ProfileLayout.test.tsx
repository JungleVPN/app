import type { GetUserByIdResponseDto } from '@workspace/types';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores';
import { ProfileLayout } from './ProfileLayout';

const { getMe, phIdentify, navigate, remnawaveApi } = vi.hoisted(() => {
  const getMe = vi.fn();
  const remnawaveApi = {
    getMe,
    getMyMetadata: vi.fn().mockResolvedValue(null),
    upsertMyMetadata: vi.fn().mockResolvedValue(undefined),
  };
  return { getMe, phIdentify: vi.fn(), navigate: vi.fn(), remnawaveApi };
});

vi.mock('../api', () => ({
  useRemnawaveApi: () => remnawaveApi,
}));

vi.mock('../runtime', () => ({
  useAppRoutes: () => ({ getSubscriptionPath: '/get-subscription' }),
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

vi.mock('../utils', () => ({ captureReferral: vi.fn(), phIdentify }));

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
});
