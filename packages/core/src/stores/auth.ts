import type { GetUserByIdResponseDto, UserScope } from '@workspace/types';
import { create } from 'zustand';
import { AuthSource, User } from '../types/tma';

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
};

export const useAuthStore = create<IAuthActions & IAuthState>()((set) => ({
  ...initialState,
  actions: {
    setAuthUser: (authUser) => set({ authUser }),
    setRmnUser: (rmnUser) => set({ rmnUser }),
    setLoading: (loading) => set({ loading }),
    setAuthSource: (authSource) => set({ authSource }),
    setTgUser: (tgUser) => set({ tgUser }),
    setTgInitDataRaw: (tgInitDataRaw) => set({ tgInitDataRaw }),
    setUserScope: (userScope) => set({ userScope }),
  },
}));

export const useAuthStoreActions = () => useAuthStore((state) => state.actions);
export const useAuthStoreInfo = () => useAuthStore((state) => state);
