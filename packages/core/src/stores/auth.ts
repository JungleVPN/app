import type { GetUserByIdResponseDto, UserScope } from '@workspace/types';
import { create } from 'zustand';
import { AuthSource, User } from '../types/tma';
import { useSavedMethodsStore } from './saved-methods';
import { useSubscriptionConfigStore } from './subscription-config';
import { useSubscriptionInfoStore } from './subscription-info';

/**
 * Platform-agnostic web user identity.
 * Populated by the web AuthProvider from whatever identity mechanism is in use.
 * Not tied to Supabase — any email/id provider can fill this.
 */
export interface AuthUser {
  id: string;
  email?: string;
}

export interface IAuthState {
  /** Authenticated web user. Null on TMA or before web auth resolves. */
  authUser: AuthUser | null;
  /** Remnawave backend user — the shared identity across all platforms. */
  rmnUser: GetUserByIdResponseDto | null;
  /** True while initial auth resolution is still in progress. */
  loading: boolean;
  /** Which auth mechanism resolved the current session. */
  authSource: AuthSource | null;
  /** Telegram user parsed from initData. Populated on TMA, always null on web. */
  tgUser: User | null;
  /** Raw initData string sent as X-Telegram-Init-Data header. */
  tgInitDataRaw: string | null;
  /**
   * The storefront the signed-in user belongs to, as stored on them. Null until
   * their metadata arrives, and for visitors who are not signed in — the host
   * answers for those, see `userScope`.
   */
  userScope: UserScope | null;
  /**
   * True once the backend has rejected the mini app's Telegram launch data,
   * which only renews when the app is opened again.
   */
  sessionExpired: boolean;
}

export interface IAuthActions {
  actions: {
    setAuthUser: (user: AuthUser | null) => void;
    setRmnUser: (user: GetUserByIdResponseDto | null) => void;
    setLoading: (loading: boolean) => void;
    setAuthSource: (source: AuthSource | null) => void;
    setTgUser: (user: User | null) => void;
    setTgInitDataRaw: (raw: string | null) => void;
    setUserScope: (scope: UserScope | null) => void;
    setSessionExpired: (expired: boolean) => void;
  };
}

const initialState: IAuthState = {
  authUser: null,
  rmnUser: null,
  loading: true,
  authSource: null,
  tgUser: null,
  tgInitDataRaw: null,
  userScope: null,
  sessionExpired: false,
};

/**
 * Everything cached about the signed-in account. It is fetched once and reused
 * for the session, so it has to go when the account does — otherwise the next
 * person to sign in on this tab is shown the previous one's subscription link.
 */
function forgetAccountData(): void {
  useSubscriptionInfoStore.getState().actions.resetState();
  useSubscriptionConfigStore.getState().actions.resetState();
  useSavedMethodsStore.getState().actions.resetState();
}

export const useAuthStore = create<IAuthActions & IAuthState>()((set, get) => ({
  ...initialState,
  actions: {
    setAuthUser: (authUser) => {
      if (get().authUser?.id === authUser?.id) {
        set({ authUser });
        return;
      }
      forgetAccountData();
      set({ authUser, rmnUser: null, userScope: null });
    },
    setRmnUser: (rmnUser) => set({ rmnUser }),
    setLoading: (loading) => set({ loading }),
    setAuthSource: (authSource) => set({ authSource }),
    setTgUser: (tgUser) => set({ tgUser }),
    setTgInitDataRaw: (tgInitDataRaw) => set({ tgInitDataRaw }),
    setUserScope: (userScope) => set({ userScope }),
    setSessionExpired: (sessionExpired) => set({ sessionExpired }),
  },
}));

export const useAuthStoreActions = () => useAuthStore((state) => state.actions);
export const useAuthStoreInfo = () => useAuthStore((state) => state);
