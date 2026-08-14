import { act, renderHook } from '@testing-library/react';
import type { User } from '@tma.js/sdk-react';
import type { CreateUserResponseDto } from '@workspace/types';
import type { SyntheticEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useGetSubscriptionPage } from './useGetSubscriptionPage';

const {
  mockBackButtonHide,
  mockConnectEmail,
  mockUpsertMyMetadata,
  mockNavigate,
  mockAuthStoreInfo,
  mockSetRmnUser,
  mockPlatformStore,
  mockAnalytics,
  mockTrackUserCreated,
  mockCaptureReferral,
  mockClearReferral,
  mockClearAttribution,
  mockGetAttribution,
  mockGetReferral,
} = vi.hoisted(() => ({
  mockBackButtonHide: vi.fn(),
  mockConnectEmail: vi.fn(),
  mockUpsertMyMetadata: vi.fn(),
  mockNavigate: vi.fn(),
  mockAuthStoreInfo: vi.fn(),
  mockSetRmnUser: vi.fn(),
  mockPlatformStore: vi.fn(),
  mockAnalytics: {
    initialPageViewed: vi.fn(),
  },
  mockTrackUserCreated: vi.fn(),
  mockCaptureReferral: vi.fn(),
  mockClearReferral: vi.fn(),
  mockClearAttribution: vi.fn(),
  mockGetAttribution: vi.fn(),
  mockGetReferral: vi.fn(),
}));

vi.mock('@tma.js/sdk-react', () => ({
  backButton: { hide: mockBackButtonHide },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../api', () => ({
  useRemnawaveApi: () => ({
    connectEmail: mockConnectEmail,
    upsertMyMetadata: mockUpsertMyMetadata,
  }),
  useAnalyticsApi: () => ({
    trackUserCreated: mockTrackUserCreated,
  }),
}));

vi.mock('../../hooks', () => ({
  useNavigation: () => mockNavigate,
}));

vi.mock('../../runtime', () => ({
  useAppRoutes: () => ({
    profileSubscriptionPath: '/profile/subscription',
    authGateRedirectPath: '/login',
  }),
}));

vi.mock('../../stores', () => ({
  useAuthStoreInfo: () => mockAuthStoreInfo(),
  useAuthStoreActions: () => ({ setRmnUser: mockSetRmnUser }),
  usePlatformStore: () => mockPlatformStore(),
}));

vi.mock('../../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils')>();
  return {
    ...actual,
    analytics: mockAnalytics,
    captureReferral: mockCaptureReferral,
    clearReferral: mockClearReferral,
    clearAttribution: mockClearAttribution,
    getAttribution: mockGetAttribution,
    getReferral: mockGetReferral,
  };
});

function createRemnaUser(overrides: Partial<CreateUserResponseDto> = {}): CreateUserResponseDto {
  return {
    uuid: 'user-uuid-1',
    id: 1,
    shortUuid: 'short-uuid-1',
    username: 'user-1',
    status: 'ACTIVE',
    trafficLimitBytes: 0,
    trafficLimitStrategy: 'NO_RESET',
    expireAt: new Date('2030-01-01'),
    telegramId: null,
    email: null,
    description: null,
    tag: null,
    hwidDeviceLimit: null,
    externalSquadUuid: null,
    trojanPassword: 'trojan-pw',
    vlessUuid: 'vless-uuid',
    ssPassword: 'ss-pw',
    lastTriggeredThreshold: 0,
    subRevokedAt: null,
    lastTrafficResetAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    subscriptionUrl: 'https://example.com/sub',
    activeInternalSquads: [],
    userTraffic: {
      usedTrafficBytes: 0,
      lifetimeUsedTrafficBytes: 0,
      onlineAt: null,
      firstConnectedAt: null,
      lastConnectedNodeUuid: null,
    },
    ...overrides,
  };
}

function createTgUser(overrides: Partial<User> = {}): User {
  return { id: 555, first_name: 'Tg', ...overrides } as User;
}

function setAuthState(overrides: Partial<ReturnType<typeof mockAuthStoreInfo>> = {}) {
  mockAuthStoreInfo.mockReturnValue({
    authUser: null,
    rmnUser: null,
    tgUser: null,
    loading: false,
    authSource: null,
    tgInitDataRaw: null,
    ...overrides,
  });
}

function setPlatform(platformType: 'web' | 'telegram' | null) {
  mockPlatformStore.mockReturnValue({ platformType });
}

function submitEvent(): SyntheticEvent {
  return { preventDefault: vi.fn() } as unknown as SyntheticEvent;
}

describe('useGetSubscriptionPage', () => {
  it('captures the referral on mount', () => {
    setAuthState();
    setPlatform('web');

    renderHook(() => useGetSubscriptionPage());

    expect(mockCaptureReferral).toHaveBeenCalledTimes(1);
  });

  it('fires the initial page view analytics event for web when no rmnUser is resolved yet', () => {
    setAuthState({ rmnUser: null });
    setPlatform('web');

    renderHook(() => useGetSubscriptionPage());

    expect(mockAnalytics.initialPageViewed).toHaveBeenCalledWith('web');
  });

  it('fires the initial page view analytics event for telegram when no rmnUser is resolved yet', () => {
    setAuthState({ rmnUser: null });
    setPlatform('telegram');

    renderHook(() => useGetSubscriptionPage());

    expect(mockAnalytics.initialPageViewed).toHaveBeenCalledWith('telegram');
  });

  it('does not fire the initial page view analytics event once a rmnUser is already resolved', () => {
    setAuthState({ rmnUser: createRemnaUser() });
    setPlatform('web');

    renderHook(() => useGetSubscriptionPage());

    expect(mockAnalytics.initialPageViewed).not.toHaveBeenCalled();
  });

  it('redirects to the subscription page when a web user is already resolved', () => {
    setAuthState({ rmnUser: createRemnaUser(), authUser: { id: 'auth-1' } });
    setPlatform('web');

    renderHook(() => useGetSubscriptionPage());

    expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription');
  });

  it('redirects to the subscription page when a telegram user is already resolved', () => {
    setAuthState({ rmnUser: createRemnaUser(), tgUser: createTgUser() });
    setPlatform('telegram');

    renderHook(() => useGetSubscriptionPage());

    expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription');
  });

  it('redirects to the login page when rmnUser is resolved but web auth session is absent', () => {
    setAuthState({ rmnUser: createRemnaUser() });
    setPlatform('web');

    renderHook(() => useGetSubscriptionPage());

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('hides the telegram back button on the telegram platform', () => {
    setAuthState();
    setPlatform('telegram');

    renderHook(() => useGetSubscriptionPage());

    expect(mockBackButtonHide).toHaveBeenCalledTimes(1);
  });

  it('does not touch the back button on the web platform', () => {
    setAuthState();
    setPlatform('web');

    renderHook(() => useGetSubscriptionPage());

    expect(mockBackButtonHide).not.toHaveBeenCalled();
  });

  it('starts with an empty email and no error', () => {
    setAuthState();
    setPlatform('web');

    const { result } = renderHook(() => useGetSubscriptionPage());

    expect(result.current.email).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('updates the email as the user types', () => {
    setAuthState();
    setPlatform('web');
    const { result } = renderHook(() => useGetSubscriptionPage());

    act(() => {
      result.current.handleEmailChange('alice@example.com');
    });

    expect(result.current.email).toBe('alice@example.com');
  });

  it('clears a previously set error as soon as the user edits the email again', async () => {
    setAuthState();
    setPlatform('web');
    const { result } = renderHook(() => useGetSubscriptionPage());

    // empty-email submit populates an error first
    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(result.current.hasError).toBe(true);

    act(() => {
      result.current.handleEmailChange('a');
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('rejects submission with an empty email without calling the api', async () => {
    setAuthState();
    setPlatform('web');
    const { result } = renderHook(() => useGetSubscriptionPage());

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(result.current.error).toBe('getSubscription.error_empty_email');
    expect(result.current.hasError).toBe(true);
    expect(mockConnectEmail).not.toHaveBeenCalled();
  });

  it('rejects submission with an invalid email without calling the api', async () => {
    setAuthState();
    setPlatform('web');
    const { result } = renderHook(() => useGetSubscriptionPage());

    act(() => {
      result.current.handleEmailChange('not-an-email');
    });
    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(result.current.error).toBe('getSubscription.error_invalid_email');
    expect(result.current.hasError).toBe(true);
    expect(mockConnectEmail).not.toHaveBeenCalled();
  });

  describe('web auto-connect flow', () => {
    it('calls connectEmail with an empty string and navigates after a new web user authenticates', async () => {
      setAuthState({ authUser: { id: 'auth-1' } });
      setPlatform('web');
      mockConnectEmail.mockResolvedValue(createRemnaUser({ shortUuid: 'new-short' }));
      mockGetAttribution.mockReturnValue(null);
      mockGetReferral.mockReturnValue(null);

      await act(async () => {
        renderHook(() => useGetSubscriptionPage());
      });

      expect(mockConnectEmail).toHaveBeenCalledWith('', { inviterId: undefined });
      expect(mockSetRmnUser).toHaveBeenCalledWith(
        expect.objectContaining({ shortUuid: 'new-short' }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription');
    });

    it('tracks user creation with attribution and clears referral and attribution after auto-connect', async () => {
      setAuthState({ authUser: { id: 'auth-1' } });
      setPlatform('web');
      mockGetAttribution.mockReturnValue({ platform: 'web' });
      mockGetReferral.mockReturnValue('inviter-1');
      mockConnectEmail.mockResolvedValue(createRemnaUser({ shortUuid: 'new-short' }));

      await act(async () => {
        renderHook(() => useGetSubscriptionPage());
      });

      expect(mockConnectEmail).toHaveBeenCalledWith('', { inviterId: 'inviter-1' });
      expect(mockTrackUserCreated).toHaveBeenCalledWith(
        expect.objectContaining({ shortUuid: 'new-short' }),
        { platform: 'web' },
      );
      expect(mockClearReferral).toHaveBeenCalled();
      expect(mockClearAttribution).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription');
    });

    it('does not call connectEmail when the web user already has a remnawave account', async () => {
      setAuthState({ authUser: { id: 'auth-1' }, rmnUser: createRemnaUser() });
      setPlatform('web');

      await act(async () => {
        renderHook(() => useGetSubscriptionPage());
      });

      expect(mockConnectEmail).not.toHaveBeenCalled();
    });

    it('does not navigate when connectEmail returns null', async () => {
      setAuthState({ authUser: { id: 'auth-1' } });
      setPlatform('web');
      mockConnectEmail.mockResolvedValue(null);
      mockGetReferral.mockReturnValue(null);

      await act(async () => {
        renderHook(() => useGetSubscriptionPage());
      });

      expect(mockConnectEmail).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate when connectEmail rejects', async () => {
      setAuthState({ authUser: { id: 'auth-1' } });
      setPlatform('web');
      mockConnectEmail.mockRejectedValue(new Error('network down'));
      mockGetReferral.mockReturnValue(null);

      await act(async () => {
        renderHook(() => useGetSubscriptionPage());
      });

      expect(mockConnectEmail).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('telegram flow', () => {
    it('calls connectEmail, sets the rmnUser, and navigates to the profile subscription page', async () => {
      setAuthState({ tgUser: createTgUser({ id: 777 }) });
      setPlatform('telegram');
      mockConnectEmail.mockResolvedValue(
        createRemnaUser({ uuid: 'existing-uuid', telegramId: 777 }),
      );
      mockGetAttribution.mockReturnValue(null);
      const { result } = renderHook(() => useGetSubscriptionPage());

      act(() => {
        result.current.handleEmailChange('tg@example.com');
      });
      await act(async () => {
        await result.current.handleSubmit(submitEvent());
      });

      expect(mockConnectEmail).toHaveBeenCalledWith('tg@example.com', { inviterId: undefined });
      expect(mockSetRmnUser).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: 'existing-uuid', telegramId: 777 }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription');
    });

    it('tracks user creation with attribution and clears referral for a first-time telegram user', async () => {
      setAuthState({ tgUser: createTgUser({ id: 888 }) });
      setPlatform('telegram');
      mockConnectEmail.mockResolvedValue(createRemnaUser({ telegramId: 888 }));
      mockGetAttribution.mockReturnValue({ platform: 'telegram' });
      mockGetReferral.mockReturnValue('inviter-2');
      const { result } = renderHook(() => useGetSubscriptionPage());

      act(() => {
        result.current.handleEmailChange('newtg@example.com');
      });
      await act(async () => {
        await result.current.handleSubmit(submitEvent());
      });

      expect(mockConnectEmail).toHaveBeenCalledWith('newtg@example.com', {
        inviterId: 'inviter-2',
      });
      expect(mockSetRmnUser).toHaveBeenCalledWith(expect.objectContaining({ telegramId: 888 }));
      expect(mockTrackUserCreated).toHaveBeenCalledWith(
        expect.objectContaining({ telegramId: 888 }),
        { platform: 'telegram' },
      );
      expect(mockClearReferral).toHaveBeenCalledTimes(1);
      expect(mockClearAttribution).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/profile/subscription');
    });
  });
});
