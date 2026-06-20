import { create } from 'zustand';

export type PlatformType = 'web' | 'telegram';
export type InitStatus = 'idle' | 'initializing' | 'ready' | 'error';
export type ClientPlatform = 'android' | 'ios' | 'tdesktop' | 'macos' | 'web' | 'unknown';

export interface IPlatformState {
  /**
   * The detected runtime platform. Set once during init — never changes
   * after the app is mounted.
   */
  platformType: PlatformType | null;

  isMobileTma: boolean;

  /**
   * Tracks the initialisation lifecycle.
   *  idle         → before init starts
   *  initializing → SDK init / auth resolution in progress
   *  ready        → init complete, app fully usable
   *  error        → unrecoverable init failure
   */
  initStatus: InitStatus;

  /** Human-readable error message when initStatus === 'error'. */
  initError: string | null;

  /** Telegram client type (android/ios/tdesktop/…). TMA only — null on web. */
  clientPlatform: string;
}

export interface IPlatformActions {
  actions: {
    setPlatformType: (type: PlatformType) => void;
    setIsMobileTma: (value: boolean) => void;
    setInitStatus: (status: InitStatus) => void;
    setInitError: (error: string) => void;
    setClientPlatform: (platform: string) => void;
  };
}

const initialState: IPlatformState = {
  platformType: null,
  isMobileTma: true,
  initStatus: 'idle',
  initError: null,
  clientPlatform: 'unknown',
};

export const usePlatformStore = create<IPlatformActions & IPlatformState>()((set) => ({
  ...initialState,
  actions: {
    setPlatformType: (platformType) => set({ platformType }),
    setIsMobileTma: (isMobileTma) => set({ isMobileTma }),
    setInitStatus: (initStatus) => set({ initStatus }),
    setInitError: (initError) => set({ initError }),
    setClientPlatform: (clientPlatform) => set({ clientPlatform }),
  },
}));

export const usePlatformStoreActions = () => usePlatformStore((state) => state.actions);
export const usePlatformStoreInfo = () => usePlatformStore((state) => state);
